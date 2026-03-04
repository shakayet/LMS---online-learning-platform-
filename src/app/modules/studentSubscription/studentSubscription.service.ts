import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import {
  IStudentSubscription,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIER,
} from './studentSubscription.interface';
import { StudentSubscription } from './studentSubscription.model';
import { Session } from '../session/session.model';
import { SESSION_STATUS } from '../session/session.interface';
import { MonthlyBilling } from '../monthlyBilling/monthlyBilling.model';
import { BILLING_STATUS } from '../monthlyBilling/monthlyBilling.interface';
import { stripe } from '../../../config/stripe';
import { PricingConfigService } from '../pricingConfig/pricingConfig.service';

// Fallback pricing configuration (EUR) - used if DB config not available
const FALLBACK_TIER_PRICING = {
  [SUBSCRIPTION_TIER.FLEXIBLE]: { pricePerHour: 30, minimumHours: 0, commitmentMonths: 0 },
  [SUBSCRIPTION_TIER.REGULAR]: { pricePerHour: 28, minimumHours: 4, commitmentMonths: 1 },
  [SUBSCRIPTION_TIER.LONG_TERM]: { pricePerHour: 25, minimumHours: 4, commitmentMonths: 3 },
};

/**
 * Get pricing for a tier (from DB or fallback)
 */
const getTierPricing = async (tier: SUBSCRIPTION_TIER) => {
  try {
    const pricingPlan = await PricingConfigService.getPricingByTier(tier);
    if (pricingPlan) {
      return {
        pricePerHour: pricingPlan.pricePerHour,
        minimumHours: pricingPlan.minimumHours,
        commitmentMonths: pricingPlan.commitmentMonths,
      };
    }
  } catch {
    // DB not available, use fallback
  }
  return FALLBACK_TIER_PRICING[tier];
};

/**
 * Subscribe to a plan (Student)
 */
const subscribeToPlan = async (
  studentId: string,
  tier: SUBSCRIPTION_TIER
): Promise<IStudentSubscription> => {
  // Verify student
  const student = await User.findById(studentId);
  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only students can subscribe to plans');
  }

  // Check if student already has active subscription
  const activeSubscription = await StudentSubscription.findOne({
    studentId: new Types.ObjectId(studentId),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  if (activeSubscription) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have an active subscription. Please cancel it first to change plans.'
    );
  }

  // Create subscription
  const subscription = await StudentSubscription.create({
    studentId: new Types.ObjectId(studentId),
    tier,
    startDate: new Date(),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  // Update user's subscription tier
  await User.findByIdAndUpdate(studentId, {
    'studentProfile.subscriptionTier': tier,
  });

  // TODO: Create Stripe customer and subscription
  // if (!student.stripeCustomerId) {
  //   const customer = await stripe.customers.create({
  //     email: student.email,
  //     name: student.name,
  //     metadata: { userId: studentId }
  //   });
  //   subscription.stripeCustomerId = customer.id;
  //   await subscription.save();
  // }

  return subscription;
};

/**
 * Get student's active subscription
 */
const getMySubscription = async (studentId: string): Promise<IStudentSubscription | null> => {
  const subscription = await StudentSubscription.findOne({
    studentId: new Types.ObjectId(studentId),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  if (!subscription) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No active subscription found');
  }

  return subscription;
};

/**
 * Get all subscriptions (Admin)
 */
const getAllSubscriptions = async (query: Record<string, unknown>) => {
  const subscriptionQuery = new QueryBuilder(
    StudentSubscription.find().populate('studentId', 'name email profilePicture'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await subscriptionQuery.modelQuery;
  const meta = await subscriptionQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

/**
 * Get single subscription
 */
const getSingleSubscription = async (id: string): Promise<IStudentSubscription | null> => {
  const subscription = await StudentSubscription.findById(id).populate(
    'studentId',
    'name email profilePicture phone'
  );

  if (!subscription) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found');
  }

  return subscription;
};

/**
 * Cancel subscription (Student)
 */
const cancelSubscription = async (
  subscriptionId: string,
  studentId: string,
  cancellationReason: string
): Promise<IStudentSubscription | null> => {
  const subscription = await StudentSubscription.findById(subscriptionId);

  if (!subscription) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found');
  }

  // Verify ownership
  if (subscription.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only cancel your own subscription'
    );
  }

  // Can only cancel ACTIVE subscriptions
  if (subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot cancel subscription with status: ${subscription.status}`
    );
  }

  // Update subscription
  subscription.status = SUBSCRIPTION_STATUS.CANCELLED;
  subscription.cancellationReason = cancellationReason;
  subscription.cancelledAt = new Date();
  await subscription.save();

  // Update user's subscription tier to null
  await User.findByIdAndUpdate(studentId, {
    'studentProfile.subscriptionTier': null,
  });

  // TODO: Cancel Stripe subscription
  // if (subscription.stripeSubscriptionId) {
  //   await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
  // }

  return subscription;
};

/**
 * Increment hours taken (Called when session completes)
 */
const incrementHoursTaken = async (
  studentId: string,
  hours: number
): Promise<void> => {
  const subscription = await StudentSubscription.findOne({
    studentId: new Types.ObjectId(studentId),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  if (subscription) {
    subscription.totalHoursTaken += hours;
    await subscription.save();
  }
};

/**
 * Auto-expire subscriptions (Cron job)
 * Marks subscriptions as EXPIRED after endDate passes
 */
const expireOldSubscriptions = async (): Promise<number> => {
  const result = await StudentSubscription.updateMany(
    {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      endDate: { $lt: new Date() },
    },
    {
      $set: { status: SUBSCRIPTION_STATUS.EXPIRED },
    }
  );

  // Update users' subscription tier to null
  const expiredSubscriptions = await StudentSubscription.find({
    status: SUBSCRIPTION_STATUS.EXPIRED,
    endDate: { $lt: new Date() },
  });

  for (const subscription of expiredSubscriptions) {
    await User.findByIdAndUpdate(subscription.studentId, {
      'studentProfile.subscriptionTier': null,
    });
  }

  return result.modifiedCount;
};

/**
 * Get plan usage details (Student)
 * Returns comprehensive usage data for student's subscription
 */
type PlanUsageResponse = {
  // Plan details
  plan: {
    name: SUBSCRIPTION_TIER | null;
    pricePerHour: number;
    commitmentMonths: number;
    minimumHours: number;
    status: SUBSCRIPTION_STATUS | null;
    startDate: Date | null;
    endDate: Date | null;
  };
  // Usage stats
  usage: {
    hoursUsed: number;
    sessionsCompleted: number;
    hoursRemaining: number | null; // null for FLEXIBLE plan (no minimum)
    sessionsRemaining: number | null; // For plans with minimum hours
  };
  // Spending
  spending: {
    currentMonthSpending: number;
    totalSpending: number;
    bufferCharges: number; // Extra time charges
  };
  // Upcoming
  upcoming: {
    scheduledSessions: number;
    upcomingHours: number;
  };
};

const getMyPlanUsage = async (studentId: string): Promise<PlanUsageResponse> => {
  // Get active subscription
  const subscription = await StudentSubscription.findOne({
    studentId: new Types.ObjectId(studentId),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  // Get current month dates
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get completed sessions for current month (excluding trial sessions - they're free!)
  const currentMonthSessions = await Session.find({
    studentId: new Types.ObjectId(studentId),
    status: SESSION_STATUS.COMPLETED,
    completedAt: { $gte: startOfMonth, $lte: endOfMonth },
    isTrial: false, // Exclude trial sessions from billing
  });

  // Calculate current month spending
  let currentMonthSpending = 0;
  let bufferCharges = 0;
  for (const session of currentMonthSessions) {
    currentMonthSpending += session.totalPrice || 0;
    bufferCharges += session.bufferPrice || 0;
  }

  // Get all completed sessions for total stats (excluding trial sessions - they're free!)
  const allCompletedSessions = await Session.aggregate([
    {
      $match: {
        studentId: new Types.ObjectId(studentId),
        status: SESSION_STATUS.COMPLETED,
        isTrial: false, // Exclude trial sessions from billing
      },
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalHours: { $sum: { $divide: ['$duration', 60] } },
        totalSpending: { $sum: '$totalPrice' },
        totalBufferCharges: { $sum: '$bufferPrice' },
      },
    },
  ]);

  const stats = allCompletedSessions[0] || {
    totalSessions: 0,
    totalHours: 0,
    totalSpending: 0,
    totalBufferCharges: 0,
  };

  // Get upcoming scheduled sessions
  const upcomingSessions = await Session.aggregate([
    {
      $match: {
        studentId: new Types.ObjectId(studentId),
        status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.STARTING_SOON] },
        startTime: { $gte: now },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalHours: { $sum: { $divide: ['$duration', 60] } },
      },
    },
  ]);

  const upcomingStats = upcomingSessions[0] || { count: 0, totalHours: 0 };

  // Build response based on subscription status
  if (!subscription) {
    // No active subscription
    return {
      plan: {
        name: null,
        pricePerHour: 30, // Default FLEXIBLE rate
        commitmentMonths: 0,
        minimumHours: 0,
        status: null,
        startDate: null,
        endDate: null,
      },
      usage: {
        hoursUsed: stats.totalHours,
        sessionsCompleted: stats.totalSessions,
        hoursRemaining: null,
        sessionsRemaining: null,
      },
      spending: {
        currentMonthSpending,
        totalSpending: stats.totalSpending,
        bufferCharges: stats.totalBufferCharges,
      },
      upcoming: {
        scheduledSessions: upcomingStats.count,
        upcomingHours: upcomingStats.totalHours,
      },
    };
  }

  // Calculate remaining hours (only for REGULAR and LONG_TERM)
  let hoursRemaining: number | null = null;
  let sessionsRemaining: number | null = null;

  if (subscription.tier !== SUBSCRIPTION_TIER.FLEXIBLE) {
    hoursRemaining = Math.max(0, subscription.minimumHours - subscription.totalHoursTaken);
    // Assuming 1 hour per session
    sessionsRemaining = Math.ceil(hoursRemaining);
  }

  return {
    plan: {
      name: subscription.tier,
      pricePerHour: subscription.pricePerHour,
      commitmentMonths: subscription.commitmentMonths,
      minimumHours: subscription.minimumHours,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
    },
    usage: {
      hoursUsed: subscription.totalHoursTaken,
      sessionsCompleted: stats.totalSessions,
      hoursRemaining,
      sessionsRemaining,
    },
    spending: {
      currentMonthSpending,
      totalSpending: stats.totalSpending,
      bufferCharges: stats.totalBufferCharges,
    },
    upcoming: {
      scheduledSessions: upcomingStats.count,
      upcomingHours: upcomingStats.totalHours,
    },
  };
};

/**
 * Create Payment Intent for Subscription
 * Called when student selects a plan and proceeds to payment
 */
type PaymentIntentResponse = {
  clientSecret: string;
  subscriptionId: string;
  amount: number;
  currency: string;
};

const createSubscriptionPaymentIntent = async (
  studentId: string,
  tier: SUBSCRIPTION_TIER
): Promise<PaymentIntentResponse> => {
  // 1. Verify student exists
  const student = await User.findById(studentId);
  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only students can subscribe to plans');
  }

  // 2. Check for existing active subscription
  const existingSubscription = await StudentSubscription.findOne({
    studentId: new Types.ObjectId(studentId),
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  if (existingSubscription) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have an active subscription. Please cancel it first to change plans.'
    );
  }

  // 3. Calculate payment amount and subscription details (from DB config)
  const pricing = await getTierPricing(tier);
  // For FLEXIBLE tier (minimumHours = 0), no upfront payment - pay per session
  // For other tiers, charge for minimum hours upfront
  const amount = pricing.pricePerHour * pricing.minimumHours; // EUR (will be 0 for FLEXIBLE)
  const amountInCents = Math.round(amount * 100);

  // Calculate end date based on tier (from DB config)
  const startDate = new Date();
  const endDate = new Date(startDate);
  const commitmentMonths = pricing.commitmentMonths;

  if (commitmentMonths === 0) {
    // Flexible: No end date (set to 100 years from now)
    endDate.setFullYear(endDate.getFullYear() + 100);
  } else {
    // Regular/Long-term: Set end date based on commitment months
    endDate.setMonth(endDate.getMonth() + commitmentMonths);
  }

  // 4. Create or get Stripe customer
  let stripeCustomerId = student.studentProfile?.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: student.email,
      name: student.name,
      metadata: { userId: studentId },
    });
    stripeCustomerId = customer.id;

    // Save customer ID to user
    await User.findByIdAndUpdate(studentId, {
      'studentProfile.stripeCustomerId': stripeCustomerId,
    });
  }

  // 5. For FLEXIBLE tier, use SetupIntent to save payment method (required for monthly billing)
  if (tier === SUBSCRIPTION_TIER.FLEXIBLE) {
    // Create SetupIntent to save payment method for future charges
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: 'off_session', // For charging later without customer present
      metadata: {
        studentId,
        tier,
        type: 'subscription_setup',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create pending subscription (will be activated after SetupIntent succeeds)
    const subscription = await StudentSubscription.create({
      studentId: new Types.ObjectId(studentId),
      tier,
      pricePerHour: pricing.pricePerHour,
      minimumHours: pricing.minimumHours,
      commitmentMonths,
      startDate,
      endDate,
      status: SUBSCRIPTION_STATUS.PENDING,
      stripeCustomerId,
      stripePaymentIntentId: setupIntent.id, // Store SetupIntent ID
    });

    // Return SetupIntent clientSecret for FLEXIBLE tier
    return {
      clientSecret: setupIntent.client_secret!,
      subscriptionId: subscription._id.toString(),
      amount: 0, // No upfront charge
      currency: 'eur',
    };
  }

  // 6. For paid tiers, create pending subscription record
  const subscription = await StudentSubscription.create({
    studentId: new Types.ObjectId(studentId),
    tier,
    pricePerHour: pricing.pricePerHour,
    minimumHours: pricing.minimumHours,
    commitmentMonths,
    startDate,
    endDate,
    status: SUBSCRIPTION_STATUS.PENDING as unknown as SUBSCRIPTION_STATUS,
    stripeCustomerId,
  });

  // 7. Create PaymentIntent for paid tiers
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'eur',
    customer: stripeCustomerId,
    setup_future_usage: 'off_session', // Attach payment method to customer for future charges
    metadata: {
      subscriptionId: subscription._id.toString(),
      studentId,
      tier,
      type: 'subscription_payment',
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // 7. Save payment intent ID to subscription
  subscription.stripePaymentIntentId = paymentIntent.id;
  await subscription.save();

  return {
    clientSecret: paymentIntent.client_secret!,
    subscriptionId: subscription._id.toString(),
    amount,
    currency: 'EUR',
  };
};

/**
 * Confirm Subscription Payment
 * Called after successful payment to activate subscription
 * Handles both PaymentIntent (REGULAR/LONG_TERM) and SetupIntent (FLEXIBLE)
 */
const confirmSubscriptionPayment = async (
  subscriptionId: string,
  paymentIntentId: string,
  studentId: string
): Promise<IStudentSubscription> => {
  // 1. Find subscription
  const subscription = await StudentSubscription.findById(subscriptionId);
  if (!subscription) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found');
  }

  // 2. Verify ownership
  if (subscription.studentId.toString() !== studentId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Unauthorized access to subscription');
  }

  // 3. Check if this is a SetupIntent (FLEXIBLE tier) or PaymentIntent (others)
  const isSetupIntent = paymentIntentId.startsWith('seti_');

  if (isSetupIntent) {
    // Handle SetupIntent for FLEXIBLE tier
    const setupIntent = await stripe.setupIntents.retrieve(paymentIntentId);
    if (setupIntent.status !== 'succeeded') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Setup not successful. Status: ${setupIntent.status}`
      );
    }

    // Set the saved payment method as default for this customer
    if (setupIntent.payment_method) {
      await stripe.customers.update(subscription.stripeCustomerId!, {
        invoice_settings: {
          default_payment_method: setupIntent.payment_method as string,
        },
      });
    }
  } else {
    // Handle PaymentIntent for REGULAR/LONG_TERM tiers
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Payment not successful. Status: ${paymentIntent.status}`
      );
    }

    // Verify payment intent matches subscription
    if (paymentIntent.metadata.subscriptionId !== subscriptionId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment intent does not match subscription');
    }

    // Set the payment method as default for this customer (for future charges)
    if (paymentIntent.payment_method) {
      await stripe.customers.update(subscription.stripeCustomerId!, {
        invoice_settings: {
          default_payment_method: paymentIntent.payment_method as string,
        },
      });
    }
  }

  // 4. Activate subscription
  subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
  subscription.paidAt = new Date();
  await subscription.save();

  // 5. Update user's subscription tier
  await User.findByIdAndUpdate(studentId, {
    'studentProfile.subscriptionTier': subscription.tier,
    'studentProfile.currentPlan': subscription.tier,
  });

  return subscription;
};

/**
 * Get Payment History (Student)
 * Returns paginated payment history from completed sessions and subscriptions
 */
type PaymentHistoryItem = {
  id: string;
  period: string;
  sessions: number;
  amount: number;
  currency: string;
  date: Date;
  type: 'subscription' | 'session' | 'billing';
  status?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  invoiceNumber?: string;
  invoiceUrl?: string;
  stripeInvoiceId?: string;
};

type PaymentHistoryResponse = {
  data: PaymentHistoryItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const getPaymentHistory = async (
  studentId: string,
  page: number = 1,
  limit: number = 10
): Promise<PaymentHistoryResponse> => {
  const skip = (page - 1) * limit;

  // Get student
  const student = await User.findById(studentId);
  if (!student) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Student not found');
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedPayments: PaymentHistoryItem[] = [];

  // Get monthly billings for this student (this is the source of truth for invoices)
  const monthlyBillings = await MonthlyBilling.find({
    studentId: new Types.ObjectId(studentId),
  }).sort({ billingYear: -1, billingMonth: -1 });

  // Add monthly billing records
  monthlyBillings.forEach((billing) => {
    formattedPayments.push({
      id: billing._id.toString(),
      period: `${monthNames[billing.billingMonth - 1]} ${String(billing.billingYear).slice(-2)}`,
      sessions: billing.totalSessions,
      amount: billing.total,
      currency: 'EUR',
      date: (billing as any).createdAt || billing.periodEnd,
      type: 'billing',
      status: billing.status as 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED',
      invoiceNumber: billing.invoiceNumber,
      invoiceUrl: billing.invoiceUrl,
    });
  });

  // Sort by date (newest first)
  formattedPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Paginate
  const total = formattedPayments.length;
  const paginatedData = formattedPayments.slice(skip, skip + limit);

  return {
    data: paginatedData,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Handle Stripe Webhook for Payment Success
 * Auto-activates subscription when payment succeeds
 */
const handlePaymentSuccess = async (paymentIntent: {
  id: string;
  metadata: { subscriptionId?: string; studentId?: string; type?: string };
}): Promise<void> => {
  // Only process subscription payments
  if (paymentIntent.metadata.type !== 'subscription_payment') {
    return;
  }

  const { subscriptionId, studentId } = paymentIntent.metadata;
  if (!subscriptionId || !studentId) {
    console.error('Missing metadata in payment intent:', paymentIntent.id);
    return;
  }

  try {
    const subscription = await StudentSubscription.findById(subscriptionId);
    if (!subscription) {
      console.error('Subscription not found:', subscriptionId);
      return;
    }

    // Skip if already active
    if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
      return;
    }

    // Activate subscription
    subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
    subscription.paidAt = new Date();
    await subscription.save();

    // Update user
    await User.findByIdAndUpdate(studentId, {
      'studentProfile.subscriptionTier': subscription.tier,
      'studentProfile.currentPlan': subscription.tier,
    });

    console.log(`Subscription ${subscriptionId} activated via webhook`);
  } catch (error) {
    console.error('Error processing payment success webhook:', error);
  }
};

export const StudentSubscriptionService = {
  subscribeToPlan,
  getMySubscription,
  getAllSubscriptions,
  getSingleSubscription,
  cancelSubscription,
  incrementHoursTaken,
  expireOldSubscriptions,
  getMyPlanUsage,
  createSubscriptionPaymentIntent,
  confirmSubscriptionPayment,
  handlePaymentSuccess,
  getPaymentHistory,
};
