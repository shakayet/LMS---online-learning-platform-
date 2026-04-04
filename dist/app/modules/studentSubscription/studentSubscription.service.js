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
exports.StudentSubscriptionService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const studentSubscription_interface_1 = require("./studentSubscription.interface");
const studentSubscription_model_1 = require("./studentSubscription.model");
const session_model_1 = require("../session/session.model");
const session_interface_1 = require("../session/session.interface");
const monthlyBilling_model_1 = require("../monthlyBilling/monthlyBilling.model");
const stripe_1 = require("../../../config/stripe");
const pricingConfig_service_1 = require("../pricingConfig/pricingConfig.service");

const FALLBACK_TIER_PRICING = {
    [studentSubscription_interface_1.SUBSCRIPTION_TIER.FLEXIBLE]: { pricePerHour: 30, minimumHours: 0, commitmentMonths: 0 },
    [studentSubscription_interface_1.SUBSCRIPTION_TIER.REGULAR]: { pricePerHour: 28, minimumHours: 4, commitmentMonths: 1 },
    [studentSubscription_interface_1.SUBSCRIPTION_TIER.LONG_TERM]: { pricePerHour: 25, minimumHours: 4, commitmentMonths: 3 },
};

const getTierPricing = (tier) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pricingPlan = yield pricingConfig_service_1.PricingConfigService.getPricingByTier(tier);
        if (pricingPlan) {
            return {
                pricePerHour: pricingPlan.pricePerHour,
                minimumHours: pricingPlan.minimumHours,
                commitmentMonths: pricingPlan.commitmentMonths,
            };
        }
    }
    catch (_a) {

    }
    return FALLBACK_TIER_PRICING[tier];
});

const subscribeToPlan = (studentId, tier) => __awaiter(void 0, void 0, void 0, function* () {

    const student = yield user_model_1.User.findById(studentId);
    if (!student || student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can subscribe to plans');
    }

    const activeSubscription = yield studentSubscription_model_1.StudentSubscription.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    if (activeSubscription) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have an active subscription. Please cancel it first to change plans.');
    }

    const subscription = yield studentSubscription_model_1.StudentSubscription.create({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        tier,
        startDate: new Date(),
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });

    yield user_model_1.User.findByIdAndUpdate(studentId, {
        'studentProfile.subscriptionTier': tier,
    });

    return subscription;
});

const getMySubscription = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield studentSubscription_model_1.StudentSubscription.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    if (!subscription) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'No active subscription found');
    }
    return subscription;
});

const getAllSubscriptions = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const subscriptionQuery = new QueryBuilder_1.default(studentSubscription_model_1.StudentSubscription.find().populate('studentId', 'name email profilePicture'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield subscriptionQuery.modelQuery;
    const meta = yield subscriptionQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});

const getSingleSubscription = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield studentSubscription_model_1.StudentSubscription.findById(id).populate('studentId', 'name email profilePicture phone');
    if (!subscription) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subscription not found');
    }
    return subscription;
});

const cancelSubscription = (subscriptionId, studentId, cancellationReason) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield studentSubscription_model_1.StudentSubscription.findById(subscriptionId);
    if (!subscription) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subscription not found');
    }

    if (subscription.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only cancel your own subscription');
    }

    if (subscription.status !== studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot cancel subscription with status: ${subscription.status}`);
    }

    subscription.status = studentSubscription_interface_1.SUBSCRIPTION_STATUS.CANCELLED;
    subscription.cancellationReason = cancellationReason;
    subscription.cancelledAt = new Date();
    yield subscription.save();

    yield user_model_1.User.findByIdAndUpdate(studentId, {
        'studentProfile.subscriptionTier': null,
    });

    return subscription;
});

const incrementHoursTaken = (studentId, hours) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield studentSubscription_model_1.StudentSubscription.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    if (subscription) {
        subscription.totalHoursTaken += hours;
        yield subscription.save();
    }
});

const expireOldSubscriptions = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield studentSubscription_model_1.StudentSubscription.updateMany({
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
        endDate: { $lt: new Date() },
    }, {
        $set: { status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.EXPIRED },
    });

    const expiredSubscriptions = yield studentSubscription_model_1.StudentSubscription.find({
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.EXPIRED,
        endDate: { $lt: new Date() },
    });
    for (const subscription of expiredSubscriptions) {
        yield user_model_1.User.findByIdAndUpdate(subscription.studentId, {
            'studentProfile.subscriptionTier': null,
        });
    }
    return result.modifiedCount;
});
const getMyPlanUsage = (studentId) => __awaiter(void 0, void 0, void 0, function* () {

    const subscription = yield studentSubscription_model_1.StudentSubscription.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const currentMonthSessions = yield session_model_1.Session.find({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: session_interface_1.SESSION_STATUS.COMPLETED,
        completedAt: { $gte: startOfMonth, $lte: endOfMonth },
        isTrial: false,
    });

    let currentMonthSpending = 0;
    let bufferCharges = 0;
    for (const session of currentMonthSessions) {
        currentMonthSpending += session.totalPrice || 0;
        bufferCharges += session.bufferPrice || 0;
    }

    const allCompletedSessions = yield session_model_1.Session.aggregate([
        {
            $match: {
                studentId: new mongoose_1.Types.ObjectId(studentId),
                status: session_interface_1.SESSION_STATUS.COMPLETED,
                isTrial: false,
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

    const upcomingSessions = yield session_model_1.Session.aggregate([
        {
            $match: {
                studentId: new mongoose_1.Types.ObjectId(studentId),
                status: { $in: [session_interface_1.SESSION_STATUS.SCHEDULED, session_interface_1.SESSION_STATUS.STARTING_SOON] },
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

    if (!subscription) {

        return {
            plan: {
                name: null,
                pricePerHour: 30,
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

    let hoursRemaining = null;
    let sessionsRemaining = null;
    if (subscription.tier !== studentSubscription_interface_1.SUBSCRIPTION_TIER.FLEXIBLE) {
        hoursRemaining = Math.max(0, subscription.minimumHours - subscription.totalHoursTaken);

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
});
const createSubscriptionPaymentIntent = (studentId, tier) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;

    const student = yield user_model_1.User.findById(studentId);
    if (!student || student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can subscribe to plans');
    }

    const existingSubscription = yield studentSubscription_model_1.StudentSubscription.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    if (existingSubscription) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have an active subscription. Please cancel it first to change plans.');
    }

    const pricing = yield getTierPricing(tier);

    const amount = pricing.pricePerHour * pricing.minimumHours;
    const amountInCents = Math.round(amount * 100);

    const startDate = new Date();
    const endDate = new Date(startDate);
    const commitmentMonths = pricing.commitmentMonths;
    if (commitmentMonths === 0) {

        endDate.setFullYear(endDate.getFullYear() + 100);
    }
    else {

        endDate.setMonth(endDate.getMonth() + commitmentMonths);
    }

    let stripeCustomerId = (_a = student.studentProfile) === null || _a === void 0 ? void 0 : _a.stripeCustomerId;
    if (!stripeCustomerId) {
        const customer = yield stripe_1.stripe.customers.create({
            email: student.email,
            name: student.name,
            metadata: { userId: studentId },
        });
        stripeCustomerId = customer.id;

        yield user_model_1.User.findByIdAndUpdate(studentId, {
            'studentProfile.stripeCustomerId': stripeCustomerId,
        });
    }

    if (tier === studentSubscription_interface_1.SUBSCRIPTION_TIER.FLEXIBLE) {

        const setupIntent = yield stripe_1.stripe.setupIntents.create({
            customer: stripeCustomerId,
            usage: 'off_session',
            metadata: {
                studentId,
                tier,
                type: 'subscription_setup',
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        const subscription = yield studentSubscription_model_1.StudentSubscription.create({
            studentId: new mongoose_1.Types.ObjectId(studentId),
            tier,
            pricePerHour: pricing.pricePerHour,
            minimumHours: pricing.minimumHours,
            commitmentMonths,
            startDate,
            endDate,
            status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.PENDING,
            stripeCustomerId,
            stripePaymentIntentId: setupIntent.id,
        });

        return {
            clientSecret: setupIntent.client_secret,
            subscriptionId: subscription._id.toString(),
            amount: 0,
            currency: 'eur',
        };
    }

    const subscription = yield studentSubscription_model_1.StudentSubscription.create({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        tier,
        pricePerHour: pricing.pricePerHour,
        minimumHours: pricing.minimumHours,
        commitmentMonths,
        startDate,
        endDate,
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.PENDING,
        stripeCustomerId,
    });

    const paymentIntent = yield stripe_1.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'eur',
        customer: stripeCustomerId,
        setup_future_usage: 'off_session',
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

    subscription.stripePaymentIntentId = paymentIntent.id;
    yield subscription.save();
    return {
        clientSecret: paymentIntent.client_secret,
        subscriptionId: subscription._id.toString(),
        amount,
        currency: 'EUR',
    };
});

const confirmSubscriptionPayment = (subscriptionId, paymentIntentId, studentId) => __awaiter(void 0, void 0, void 0, function* () {

    const subscription = yield studentSubscription_model_1.StudentSubscription.findById(subscriptionId);
    if (!subscription) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subscription not found');
    }

    if (subscription.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Unauthorized access to subscription');
    }

    const isSetupIntent = paymentIntentId.startsWith('seti_');
    if (isSetupIntent) {

        const setupIntent = yield stripe_1.stripe.setupIntents.retrieve(paymentIntentId);
        if (setupIntent.status !== 'succeeded') {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Setup not successful. Status: ${setupIntent.status}`);
        }

        if (setupIntent.payment_method) {
            yield stripe_1.stripe.customers.update(subscription.stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: setupIntent.payment_method,
                },
            });
        }
    }
    else {

        const paymentIntent = yield stripe_1.stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Payment not successful. Status: ${paymentIntent.status}`);
        }

        if (paymentIntent.metadata.subscriptionId !== subscriptionId) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Payment intent does not match subscription');
        }

        if (paymentIntent.payment_method) {
            yield stripe_1.stripe.customers.update(subscription.stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentIntent.payment_method,
                },
            });
        }
    }

    subscription.status = studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE;
    subscription.paidAt = new Date();
    yield subscription.save();

    yield user_model_1.User.findByIdAndUpdate(studentId, {
        'studentProfile.subscriptionTier': subscription.tier,
        'studentProfile.currentPlan': subscription.tier,
    });
    return subscription;
});
const getPaymentHistory = (studentId_1, ...args_1) => __awaiter(void 0, [studentId_1, ...args_1], void 0, function* (studentId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const student = yield user_model_1.User.findById(studentId);
    if (!student) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Student not found');
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedPayments = [];

    const monthlyBillings = yield monthlyBilling_model_1.MonthlyBilling.find({
        studentId: new mongoose_1.Types.ObjectId(studentId),
    }).sort({ billingYear: -1, billingMonth: -1 });

    monthlyBillings.forEach((billing) => {
        formattedPayments.push({
            id: billing._id.toString(),
            period: `${monthNames[billing.billingMonth - 1]} ${String(billing.billingYear).slice(-2)}`,
            sessions: billing.totalSessions,
            amount: billing.total,
            currency: 'EUR',
            date: billing.createdAt || billing.periodEnd,
            type: 'billing',
            status: billing.status,
            invoiceNumber: billing.invoiceNumber,
            invoiceUrl: billing.invoiceUrl,
        });
    });

    formattedPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
});

const handlePaymentSuccess = (paymentIntent) => __awaiter(void 0, void 0, void 0, function* () {

    if (paymentIntent.metadata.type !== 'subscription_payment') {
        return;
    }
    const { subscriptionId, studentId } = paymentIntent.metadata;
    if (!subscriptionId || !studentId) {
        console.error('Missing metadata in payment intent:', paymentIntent.id);
        return;
    }
    try {
        const subscription = yield studentSubscription_model_1.StudentSubscription.findById(subscriptionId);
        if (!subscription) {
            console.error('Subscription not found:', subscriptionId);
            return;
        }

        if (subscription.status === studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE) {
            return;
        }

        subscription.status = studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE;
        subscription.paidAt = new Date();
        yield subscription.save();

        yield user_model_1.User.findByIdAndUpdate(studentId, {
            'studentProfile.subscriptionTier': subscription.tier,
            'studentProfile.currentPlan': subscription.tier,
        });
        console.log(`Subscription ${subscriptionId} activated via webhook`);
    }
    catch (error) {
        console.error('Error processing payment success webhook:', error);
    }
});
exports.StudentSubscriptionService = {
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
