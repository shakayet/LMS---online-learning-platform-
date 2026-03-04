"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonthlyBillingService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const session_model_1 = require("../session/session.model");
const studentSubscription_model_1 = require("../studentSubscription/studentSubscription.model");
const session_interface_1 = require("../session/session.interface");
const studentSubscription_interface_1 = require("../studentSubscription/studentSubscription.interface");
const monthlyBilling_interface_1 = require("./monthlyBilling.interface");
const monthlyBilling_model_1 = require("./monthlyBilling.model");
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-01-27.acacia',
});
/**
 * Generate monthly billing for all active students
 * Called by cron job at month-end
 *
 * Billing Logic by Tier:
 * - FLEXIBLE: All sessions are billed (no upfront payment)
 * - REGULAR: First 4 hours/month covered by upfront, extra sessions billed at €28/hr
 * - LONG_TERM: First 4 hours/month covered by upfront, extra sessions billed at €25/hr
 */
const generateMonthlyBillings = (month, year) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Get period dates
    const periodStart = new Date(year, month - 1, 1); // First day of month
    const periodEnd = new Date(year, month, 0, 23, 59, 59); // Last day of month
    // Find all active subscriptions
    const activeSubscriptions = yield studentSubscription_model_1.StudentSubscription.find({
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    }).populate('studentId');
    const billings = [];
    console.log(`[Billing] Starting billing generation for ${month}/${year}`);
    console.log(`[Billing] Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
    console.log(`[Billing] Found ${activeSubscriptions.length} active subscriptions`);
    for (const subscription of activeSubscriptions) {
        try {
            // Get the actual studentId (ObjectId) - after populate, studentId is the full user object
            const studentId = subscription.studentId._id || subscription.studentId;
            console.log(`[Billing] Processing student: ${studentId}`);
            console.log(`[Billing] studentId type: ${typeof studentId}, value: ${studentId}`);
            // Check if billing already exists for this month
            const existingBilling = yield monthlyBilling_model_1.MonthlyBilling.findOne({
                studentId: studentId,
                billingMonth: month,
                billingYear: year,
            });
            if (existingBilling) {
                console.log(`[Billing] Skipping - billing already exists for student ${studentId}`);
                continue; // Skip if already billed
            }
            // Get completed sessions for this student in billing period
            // Only get sessions that are NOT already marked as paid upfront and NOT already billed
            const sessions = yield session_model_1.Session.find({
                studentId: studentId,
                studentCompletionStatus: session_interface_1.COMPLETION_STATUS.COMPLETED,
                isTrial: false, // Exclude trial sessions
                isPaidUpfront: { $ne: true }, // Exclude sessions already covered by upfront payment
                billingId: { $exists: false }, // Exclude already billed sessions
                studentCompletedAt: {
                    $gte: periodStart,
                    $lte: periodEnd,
                },
            }).populate('tutorId', 'name').sort({ studentCompletedAt: 1 });
            console.log(`[Billing] Found ${sessions.length} billable sessions for student ${studentId}`);
            // For REGULAR and LONG_TERM tiers, check if there are still prepaid hours to use
            let sessionsToCharge = sessions;
            let prepaidHoursUsedThisMonth = 0;
            if (subscription.tier === studentSubscription_interface_1.SUBSCRIPTION_TIER.REGULAR || subscription.tier === studentSubscription_interface_1.SUBSCRIPTION_TIER.LONG_TERM) {
                // Get the minimum hours that are prepaid per month
                const prepaidHoursPerMonth = subscription.minimumHours; // 4 hours
                // Calculate how many hours were already marked as prepaid for THIS month
                const prepaidSessionsThisMonth = yield session_model_1.Session.countDocuments({
                    studentId: studentId,
                    isPaidUpfront: true,
                    studentCompletedAt: {
                        $gte: periodStart,
                        $lte: periodEnd,
                    },
                });
                prepaidHoursUsedThisMonth = prepaidSessionsThisMonth; // Each session = 1 hour
                // Mark remaining sessions as prepaid until we hit the limit
                const remainingPrepaidHours = Math.max(0, prepaidHoursPerMonth - prepaidHoursUsedThisMonth);
                if (remainingPrepaidHours > 0) {
                    // Mark the first N sessions as prepaid (covered by upfront payment)
                    const sessionsToMarkPrepaid = sessions.slice(0, remainingPrepaidHours);
                    const sessionIdsToMarkPrepaid = sessionsToMarkPrepaid.map(s => s._id);
                    if (sessionIdsToMarkPrepaid.length > 0) {
                        yield session_model_1.Session.updateMany({ _id: { $in: sessionIdsToMarkPrepaid } }, {
                            $set: {
                                isPaidUpfront: true,
                                billedAt: new Date(),
                            }
                        });
                        // Update subscription's prepaidHoursUsed counter
                        yield studentSubscription_model_1.StudentSubscription.findByIdAndUpdate(subscription._id, { $inc: { prepaidHoursUsed: sessionIdsToMarkPrepaid.length } });
                        console.log(`Marked ${sessionIdsToMarkPrepaid.length} sessions as prepaid for student ${subscription.studentId}`);
                    }
                    // Only charge for sessions beyond the prepaid hours
                    sessionsToCharge = sessions.slice(remainingPrepaidHours);
                }
            }
            // If no sessions to charge, skip creating a billing
            if (sessionsToCharge.length === 0) {
                console.log(`No billable sessions for student ${subscription.studentId} in ${month}/${year}`);
                continue;
            }
            // Build line items for sessions that need to be charged
            const lineItems = sessionsToCharge.map(session => ({
                sessionId: session._id,
                subject: session.subject,
                tutorName: session.tutorId.name,
                date: session.studentCompletedAt || session.completedAt,
                duration: session.duration,
                pricePerHour: subscription.pricePerHour, // Use subscription price, not session price
                amount: subscription.pricePerHour, // Each session is 1 hour
            }));
            // Create billing record
            const billing = yield monthlyBilling_model_1.MonthlyBilling.create({
                studentId: studentId,
                subscriptionId: subscription._id,
                billingMonth: month,
                billingYear: year,
                periodStart,
                periodEnd,
                lineItems,
                subscriptionTier: subscription.tier,
                pricePerHour: subscription.pricePerHour,
                status: monthlyBilling_interface_1.BILLING_STATUS.PENDING,
            });
            // Mark these sessions as billed
            const billedSessionIds = sessionsToCharge.map(s => s._id);
            yield session_model_1.Session.updateMany({ _id: { $in: billedSessionIds } }, {
                $set: {
                    billingId: billing._id,
                    billedAt: new Date(),
                }
            });
            billings.push(billing);
            // Create Stripe Invoice and auto-charge
            const student = subscription.studentId;
            if (subscription.stripeCustomerId && billing.total > 0) {
                try {
                    // Create the invoice first, then attach items directly to it
                    const invoice = yield stripe.invoices.create({
                        customer: subscription.stripeCustomerId,
                        currency: 'eur', // Must match invoice items currency
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
                    // Create invoice items attached directly to the invoice
                    for (const item of lineItems) {
                        yield stripe.invoiceItems.create({
                            customer: subscription.stripeCustomerId,
                            invoice: invoice.id,
                            amount: Math.round(item.amount * 100), // Convert to cents
                            currency: 'eur',
                            description: `${item.subject} session with ${item.tutorName} (${new Date(item.date).toLocaleDateString()})`,
                        });
                    }
                    // Finalize the invoice (required before payment)
                    const finalizedInvoice = yield stripe.invoices.finalizeInvoice(invoice.id);
                    // Store the invoice ID and URL immediately
                    billing.stripeInvoiceId = finalizedInvoice.id;
                    billing.invoiceUrl = finalizedInvoice.hosted_invoice_url || finalizedInvoice.invoice_pdf || undefined;
                    // Try to pay the invoice
                    try {
                        const paidInvoice = yield stripe.invoices.pay(finalizedInvoice.id);
                        if (paidInvoice.status === 'paid') {
                            billing.status = monthlyBilling_interface_1.BILLING_STATUS.PAID;
                            billing.paidAt = new Date();
                            billing.paymentMethod = 'card';
                            // Update invoice URL after payment (may have changed)
                            billing.invoiceUrl = paidInvoice.hosted_invoice_url || paidInvoice.invoice_pdf || billing.invoiceUrl;
                            console.log(`Auto-charged €${billing.total} for student ${studentId}`);
                        }
                    }
                    catch (paymentError) {
                        // Stripe auto-collects on finalize (auto_advance + charge_automatically),
                        // so .pay() may throw "Invoice is already paid" — that's actually a success
                        if ((_a = paymentError.message) === null || _a === void 0 ? void 0 : _a.includes('already paid')) {
                            const invoice = yield stripe.invoices.retrieve(finalizedInvoice.id);
                            billing.status = monthlyBilling_interface_1.BILLING_STATUS.PAID;
                            billing.paidAt = new Date();
                            billing.paymentMethod = 'card';
                            billing.invoiceUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || billing.invoiceUrl;
                            console.log(`Invoice already auto-paid for student ${studentId} — marked as PAID`);
                        }
                        else {
                            // Actual payment failure - student can pay later
                            console.error(`Payment failed for student ${studentId}:`, paymentError.message);
                            billing.status = monthlyBilling_interface_1.BILLING_STATUS.FAILED;
                            billing.failureReason = paymentError.message;
                        }
                    }
                    yield billing.save();
                }
                catch (invoiceError) {
                    console.error(`Invoice creation failed for student ${studentId}:`, invoiceError.message);
                    billing.status = monthlyBilling_interface_1.BILLING_STATUS.FAILED;
                    billing.failureReason = invoiceError.message;
                    yield billing.save();
                }
            }
        }
        catch (error) {
            // Log error but continue with other billings
            console.error(`Error generating billing for student ${subscription.studentId}:`, error.message);
        }
    }
    return billings;
});
/**
 * Get student's billing history
 */
const getMyBillings = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const billingQuery = new QueryBuilder_1.default(monthlyBilling_model_1.MonthlyBilling.find({ studentId: new mongoose_1.Types.ObjectId(studentId) }), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield billingQuery.modelQuery;
    const meta = yield billingQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});
/**
 * Get all billings (Admin)
 */
const getAllBillings = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const billingQuery = new QueryBuilder_1.default(monthlyBilling_model_1.MonthlyBilling.find().populate('studentId', 'name email profilePicture'), query)
        .search(['invoiceNumber'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield billingQuery.modelQuery;
    const meta = yield billingQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});
/**
 * Get single billing
 */
const getSingleBilling = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const billing = yield monthlyBilling_model_1.MonthlyBilling.findById(id)
        .populate('studentId', 'name email profilePicture phone')
        .populate('subscriptionId');
    if (!billing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Billing not found');
    }
    return billing;
});
/**
 * Mark billing as paid (Webhook handler or manual)
 */
const markAsPaid = (billingId, paymentDetails) => __awaiter(void 0, void 0, void 0, function* () {
    const billing = yield monthlyBilling_model_1.MonthlyBilling.findById(billingId);
    if (!billing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Billing not found');
    }
    if (billing.status === monthlyBilling_interface_1.BILLING_STATUS.PAID) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Billing is already paid');
    }
    billing.status = monthlyBilling_interface_1.BILLING_STATUS.PAID;
    billing.paidAt = new Date();
    if (paymentDetails) {
        billing.stripePaymentIntentId = paymentDetails.stripePaymentIntentId;
        billing.paymentMethod = paymentDetails.paymentMethod;
    }
    yield billing.save();
    // TODO: Send payment confirmation email
    // await sendEmail({
    //   to: student.email,
    //   subject: 'Payment Received',
    //   template: 'payment-confirmation',
    //   data: { billing }
    // });
    return billing;
});
/**
 * Mark billing as failed
 */
const markAsFailed = (billingId, failureReason) => __awaiter(void 0, void 0, void 0, function* () {
    const billing = yield monthlyBilling_model_1.MonthlyBilling.findById(billingId);
    if (!billing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Billing not found');
    }
    billing.status = monthlyBilling_interface_1.BILLING_STATUS.FAILED;
    billing.failureReason = failureReason;
    yield billing.save();
    // TODO: Send payment failure email
    // await sendEmail({
    //   to: student.email,
    //   subject: 'Payment Failed',
    //   template: 'payment-failed',
    //   data: { billing, failureReason }
    // });
    return billing;
});
exports.MonthlyBillingService = {
    generateMonthlyBillings,
    getMyBillings,
    getAllBillings,
    getSingleBilling,
    markAsPaid,
    markAsFailed,
};
