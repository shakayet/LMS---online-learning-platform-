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
exports.PaymentMethodService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const stripe_1 = require("../../../config/stripe");
/**
 * Get all saved payment methods for a student
 */
const getPaymentMethods = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const student = yield user_model_1.User.findById(studentId);
    if (!student || student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can access payment methods');
    }
    const stripeCustomerId = (_a = student.studentProfile) === null || _a === void 0 ? void 0 : _a.stripeCustomerId;
    if (!stripeCustomerId) {
        return { paymentMethods: [], defaultPaymentMethodId: null };
    }
    // Get all payment methods
    const paymentMethods = yield stripe_1.stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
    });
    // Get customer to find default payment method
    const customer = yield stripe_1.stripe.customers.retrieve(stripeCustomerId);
    const defaultPaymentMethodId = ((_b = customer.invoice_settings) === null || _b === void 0 ? void 0 : _b.default_payment_method) || null;
    return {
        paymentMethods: paymentMethods.data.map((pm) => {
            var _a, _b, _c, _d;
            return ({
                id: pm.id,
                brand: ((_a = pm.card) === null || _a === void 0 ? void 0 : _a.brand) || 'unknown',
                last4: ((_b = pm.card) === null || _b === void 0 ? void 0 : _b.last4) || '****',
                expMonth: (_c = pm.card) === null || _c === void 0 ? void 0 : _c.exp_month,
                expYear: (_d = pm.card) === null || _d === void 0 ? void 0 : _d.exp_year,
                isDefault: pm.id === defaultPaymentMethodId,
            });
        }),
        defaultPaymentMethodId,
    };
});
/**
 * Create SetupIntent for adding a new payment method
 * Frontend uses this to securely collect card details
 */
const createSetupIntent = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const student = yield user_model_1.User.findById(studentId);
    if (!student || student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can add payment methods');
    }
    // Get or create Stripe customer
    let stripeCustomerId = (_a = student.studentProfile) === null || _a === void 0 ? void 0 : _a.stripeCustomerId;
    if (!stripeCustomerId) {
        const customer = yield stripe_1.stripe.customers.create({
            email: student.email,
            name: student.name,
            metadata: { userId: studentId },
        });
        stripeCustomerId = customer.id;
        // Save customer ID to user - ensure studentProfile exists
        if (student.studentProfile) {
            yield user_model_1.User.findByIdAndUpdate(studentId, {
                'studentProfile.stripeCustomerId': stripeCustomerId,
            });
        }
        else {
            // Create studentProfile if it doesn't exist
            yield user_model_1.User.findByIdAndUpdate(studentId, {
                studentProfile: {
                    stripeCustomerId: stripeCustomerId,
                },
            });
        }
    }
    // Create SetupIntent
    const setupIntent = yield stripe_1.stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        metadata: { studentId },
    });
    return {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
    };
});
/**
 * Confirm and attach payment method after SetupIntent succeeds
 */
const attachPaymentMethod = (studentId_1, paymentMethodId_1, ...args_1) => __awaiter(void 0, [studentId_1, paymentMethodId_1, ...args_1], void 0, function* (studentId, paymentMethodId, setAsDefault = false) {
    var _a, _b, _c, _d, _e;
    const student = yield user_model_1.User.findById(studentId);
    if (!student || student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can add payment methods');
    }
    const stripeCustomerId = (_a = student.studentProfile) === null || _a === void 0 ? void 0 : _a.stripeCustomerId;
    if (!stripeCustomerId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No Stripe customer found');
    }
    // Attach payment method to customer
    yield stripe_1.stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
    });
    // Set as default if requested or if it's the first payment method
    if (setAsDefault) {
        yield stripe_1.stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
    }
    // Return updated payment method
    const paymentMethod = yield stripe_1.stripe.paymentMethods.retrieve(paymentMethodId);
    return {
        id: paymentMethod.id,
        brand: ((_b = paymentMethod.card) === null || _b === void 0 ? void 0 : _b.brand) || 'unknown',
        last4: ((_c = paymentMethod.card) === null || _c === void 0 ? void 0 : _c.last4) || '****',
        expMonth: (_d = paymentMethod.card) === null || _d === void 0 ? void 0 : _d.exp_month,
        expYear: (_e = paymentMethod.card) === null || _e === void 0 ? void 0 : _e.exp_year,
        isDefault: setAsDefault,
    };
});
/**
 * Set a payment method as default
 */
const setDefaultPaymentMethod = (studentId, paymentMethodId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const student = yield user_model_1.User.findById(studentId);
    if (!student || student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can manage payment methods');
    }
    const stripeCustomerId = (_a = student.studentProfile) === null || _a === void 0 ? void 0 : _a.stripeCustomerId;
    if (!stripeCustomerId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No Stripe customer found');
    }
    // Verify payment method belongs to this customer
    const paymentMethod = yield stripe_1.stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== stripeCustomerId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Payment method does not belong to this customer');
    }
    // Set as default
    yield stripe_1.stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
            default_payment_method: paymentMethodId,
        },
    });
    return { success: true, defaultPaymentMethodId: paymentMethodId };
});
/**
 * Delete/detach a payment method
 */
const deletePaymentMethod = (studentId, paymentMethodId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const student = yield user_model_1.User.findById(studentId);
    if (!student || student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can manage payment methods');
    }
    const stripeCustomerId = (_a = student.studentProfile) === null || _a === void 0 ? void 0 : _a.stripeCustomerId;
    if (!stripeCustomerId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No Stripe customer found');
    }
    // Verify payment method belongs to this customer
    const paymentMethod = yield stripe_1.stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== stripeCustomerId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Payment method does not belong to this customer');
    }
    // Detach payment method
    yield stripe_1.stripe.paymentMethods.detach(paymentMethodId);
    return { success: true, deletedPaymentMethodId: paymentMethodId };
});
exports.PaymentMethodService = {
    getPaymentMethods,
    createSetupIntent,
    attachPaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
};
