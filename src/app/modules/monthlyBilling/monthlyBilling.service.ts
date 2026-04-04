import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { Session } from '../session/session.model';
import { StudentSubscription } from '../studentSubscription/studentSubscription.model';
import { SESSION_STATUS, COMPLETION_STATUS } from '../session/session.interface';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_TIER } from '../studentSubscription/studentSubscription.interface';
import {
  IMonthlyBilling,
  BILLING_STATUS,
  IBillingLineItem,
} from './monthlyBilling.interface';
import { MonthlyBilling } from './monthlyBilling.model';
import { stripe } from '../../../config/stripe';

const generateMonthlyBillings = async (
  month: number,
  year: number
): Promise<IMonthlyBilling[]> => {

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  const activeSubscriptions = await StudentSubscription.find({
    status: SUBSCRIPTION_STATUS.ACTIVE,
  }).populate('studentId');

  const billings: IMonthlyBilling[] = [];

  console.log(`[Billing] Starting billing generation for ${month}/${year}`);
  console.log(`[Billing] Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
  console.log(`[Billing] Found ${activeSubscriptions.length} active subscriptions`);

  for (const subscription of activeSubscriptions) {
    try {

      const studentId = (subscription.studentId as any)._id || subscription.studentId;

      console.log(`[Billing] Processing student: ${studentId}`);
      console.log(`[Billing] studentId type: ${typeof studentId}, value: ${studentId}`);

      const existingBilling = await MonthlyBilling.findOne({
        studentId: studentId,
        billingMonth: month,
        billingYear: year,
      });

      if (existingBilling) {
        console.log(`[Billing] Skipping - billing already exists for student ${studentId}`);
        continue;
      }

      const sessions = await Session.find({
        studentId: studentId,
        studentCompletionStatus: COMPLETION_STATUS.COMPLETED,
        isTrial: false,
        isPaidUpfront: { $ne: true },
        billingId: { $exists: false },
        studentCompletedAt: {
          $gte: periodStart,
          $lte: periodEnd,
        },
      }).populate('tutorId', 'name').sort({ studentCompletedAt: 1 });

      console.log(`[Billing] Found ${sessions.length} billable sessions for student ${studentId}`);

      let sessionsToCharge = sessions;
      let prepaidHoursUsedThisMonth = 0;

      if (subscription.tier === SUBSCRIPTION_TIER.REGULAR || subscription.tier === SUBSCRIPTION_TIER.LONG_TERM) {

        const prepaidHoursPerMonth = subscription.minimumHours;

        const prepaidSessionsThisMonth = await Session.countDocuments({
          studentId: studentId,
          isPaidUpfront: true,
          studentCompletedAt: {
            $gte: periodStart,
            $lte: periodEnd,
          },
        });

        prepaidHoursUsedThisMonth = prepaidSessionsThisMonth;

        const remainingPrepaidHours = Math.max(0, prepaidHoursPerMonth - prepaidHoursUsedThisMonth);

        if (remainingPrepaidHours > 0) {

          const sessionsToMarkPrepaid = sessions.slice(0, remainingPrepaidHours);
          const sessionIdsToMarkPrepaid = sessionsToMarkPrepaid.map(s => s._id);

          if (sessionIdsToMarkPrepaid.length > 0) {
            await Session.updateMany(
              { _id: { $in: sessionIdsToMarkPrepaid } },
              {
                $set: {
                  isPaidUpfront: true,
                  billedAt: new Date(),
                }
              }
            );

            await StudentSubscription.findByIdAndUpdate(
              subscription._id,
              { $inc: { prepaidHoursUsed: sessionIdsToMarkPrepaid.length } }
            );

            console.log(`Marked ${sessionIdsToMarkPrepaid.length} sessions as prepaid for student ${subscription.studentId}`);
          }

          sessionsToCharge = sessions.slice(remainingPrepaidHours);
        }
      }

      if (sessionsToCharge.length === 0) {
        console.log(`No billable sessions for student ${subscription.studentId} in ${month}/${year}`);
        continue;
      }

      const lineItems: IBillingLineItem[] = sessionsToCharge.map(session => ({
        sessionId: session._id as Types.ObjectId,
        subject: session.subject,
        tutorName: (session.tutorId as any).name,
        date: session.studentCompletedAt || session.completedAt!,
        duration: session.duration,
        pricePerHour: subscription.pricePerHour,
        amount: subscription.pricePerHour,
      }));

      const billing = await MonthlyBilling.create({
        studentId: studentId,
        subscriptionId: subscription._id,
        billingMonth: month,
        billingYear: year,
        periodStart,
        periodEnd,
        lineItems,
        subscriptionTier: subscription.tier,
        pricePerHour: subscription.pricePerHour,
        status: BILLING_STATUS.PENDING,
      });

      const billedSessionIds = sessionsToCharge.map(s => s._id);
      await Session.updateMany(
        { _id: { $in: billedSessionIds } },
        {
          $set: {
            billingId: billing._id,
            billedAt: new Date(),
          }
        }
      );

      billings.push(billing);

      const student = subscription.studentId as any;
      if (subscription.stripeCustomerId && billing.total > 0) {
        try {

          const invoice = await stripe.invoices.create({
            customer: subscription.stripeCustomerId,
            currency: 'eur',
            auto_advance: true,
            collection_method: 'charge_automatically',
            pending_invoice_items_behavior: 'exclude',
            metadata: {
              billingId: billing._id.toString(),
              studentId: studentId.toString(),
              billingMonth: month.toString(),
              billingYear: year.toString(),
            },
          });

          for (const item of lineItems) {
            await stripe.invoiceItems.create({
              customer: subscription.stripeCustomerId,
              invoice: invoice.id,
              amount: Math.round(item.amount * 100),
              currency: 'eur',
              description: `${item.subject} session with ${item.tutorName} (${new Date(item.date).toLocaleDateString()})`,
            });
          }

          const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id!);

          billing.stripeInvoiceId = finalizedInvoice.id;
          billing.invoiceUrl = finalizedInvoice.hosted_invoice_url || finalizedInvoice.invoice_pdf || undefined;

          try {
            const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id!);

            if (paidInvoice.status === 'paid') {
              billing.status = BILLING_STATUS.PAID;
              billing.paidAt = new Date();
              billing.paymentMethod = 'card';

              billing.invoiceUrl = paidInvoice.hosted_invoice_url || paidInvoice.invoice_pdf || billing.invoiceUrl;
              console.log(`Auto-charged €${billing.total} for student ${studentId}`);
            }
          } catch (paymentError: any) {

            if (paymentError.message?.includes('already paid')) {
              const invoice = await stripe.invoices.retrieve(finalizedInvoice.id!);
              billing.status = BILLING_STATUS.PAID;
              billing.paidAt = new Date();
              billing.paymentMethod = 'card';
              billing.invoiceUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || billing.invoiceUrl;
              console.log(`Invoice already auto-paid for student ${studentId} — marked as PAID`);
            } else {

              console.error(`Payment failed for student ${studentId}:`, paymentError.message);
              billing.status = BILLING_STATUS.FAILED;
              billing.failureReason = paymentError.message;
            }
          }

          await billing.save();

        } catch (invoiceError: any) {
          console.error(`Invoice creation failed for student ${studentId}:`, invoiceError.message);
          billing.status = BILLING_STATUS.FAILED;
          billing.failureReason = invoiceError.message;
          await billing.save();
        }
      }
    } catch (error: any) {

      console.error(
        `Error generating billing for student ${subscription.studentId}:`,
        error.message
      );
    }
  }

  return billings;
};

const getMyBillings = async (
  studentId: string,
  query: Record<string, unknown>
) => {
  const billingQuery = new QueryBuilder(
    MonthlyBilling.find({ studentId: new Types.ObjectId(studentId) }),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await billingQuery.modelQuery;
  const meta = await billingQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

const getAllBillings = async (query: Record<string, unknown>) => {
  const billingQuery = new QueryBuilder(
    MonthlyBilling.find().populate('studentId', 'name email profilePicture'),
    query
  )
    .search(['invoiceNumber'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await billingQuery.modelQuery;
  const meta = await billingQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

const getSingleBilling = async (id: string): Promise<IMonthlyBilling | null> => {
  const billing = await MonthlyBilling.findById(id)
    .populate('studentId', 'name email profilePicture phone')
    .populate('subscriptionId');

  if (!billing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found');
  }

  return billing;
};

const markAsPaid = async (
  billingId: string,
  paymentDetails?: {
    stripePaymentIntentId?: string;
    paymentMethod?: string;
  }
): Promise<IMonthlyBilling | null> => {
  const billing = await MonthlyBilling.findById(billingId);

  if (!billing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found');
  }

  if (billing.status === BILLING_STATUS.PAID) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Billing is already paid');
  }

  billing.status = BILLING_STATUS.PAID;
  billing.paidAt = new Date();

  if (paymentDetails) {
    billing.stripePaymentIntentId = paymentDetails.stripePaymentIntentId;
    billing.paymentMethod = paymentDetails.paymentMethod;
  }

  await billing.save();

  return billing;
};

const markAsFailed = async (
  billingId: string,
  failureReason: string
): Promise<IMonthlyBilling | null> => {
  const billing = await MonthlyBilling.findById(billingId);

  if (!billing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found');
  }

  billing.status = BILLING_STATUS.FAILED;
  billing.failureReason = failureReason;
  await billing.save();

  return billing;
};

export const MonthlyBillingService = {
  generateMonthlyBillings,
  getMyBillings,
  getAllBillings,
  getSingleBilling,
  markAsPaid,
  markAsFailed,
};
