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
const mongoose_1 = __importDefault(require("mongoose"));
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const payment_model_1 = require("./payment.model");
const stripe_1 = require("../../../config/stripe");
const stripe_adapter_1 = require("./stripe.adapter");
// Create Stripe Connect account for freelancers
const createStripeAccount = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_model_1.User.findById(data.userId).select('name email phone dateOfBirth location');
        if (!user) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
        }
        const existingAccount = yield payment_model_1.StripeAccount.isExistAccountByUserId(data.userId);
        if (existingAccount) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, 'User already has a Stripe account');
        }
        let dob;
        if (user.dateOfBirth && typeof user.dateOfBirth === 'string') {
            const parts = user.dateOfBirth.split('-');
            // Validate that we have all parts and they are valid numbers
            if (parts.length >= 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);
                // Only set dob if all values are valid numbers
                if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                    dob = { year, month, day };
                }
            }
        }
        const account = yield (0, stripe_adapter_1.createExpressAccount)({
            email: user.email,
            firstName: user.name.split(' ')[0],
            lastName: user.name.split(' ')[1] || '',
            dob,
            city: user.location || undefined,
            metadata: {
                user_id: data.userId.toString(),
                account_type: data.accountType,
            },
        });
        const stripeAccount = new payment_model_1.StripeAccount({
            userId: data.userId,
            stripeAccountId: account.id,
            onboardingCompleted: false,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            country: account.country,
            currency: account.default_currency || 'usd',
            businessType: account.business_type || 'individual',
        });
        yield stripeAccount.save();
        // Create onboarding link for the newly created account
        const onboardingUrl = yield (0, stripe_adapter_1.createOnboardingLink)(account.id, `${process.env.FRONTEND_URL}/free-trial-teacher-dash?stripe_onboarding=refresh`, `${process.env.FRONTEND_URL}/free-trial-teacher-dash?stripe_onboarding=success`);
        return {
            accountId: account.id,
            onboardingUrl,
            onboarding_required: !account.charges_enabled,
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.default)
            throw error;
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, `Failed to create Stripe account: ${(0, stripe_1.handleStripeError)(error)}`);
    }
});
// Create onboarding link for freelancer
const createOnboardingLink = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const stripeAccount = yield payment_model_1.StripeAccount.isExistAccountByUserId(userObjectId);
        if (!stripeAccount) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, 'Stripe account not found. Please create an account first.');
        }
        if (stripeAccount.onboardingCompleted) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, 'User has already completed onboarding');
        }
        const url = yield (0, stripe_adapter_1.createOnboardingLink)(stripeAccount.stripeAccountId, `${process.env.FRONTEND_URL}/free-trial-teacher-dash?stripe_onboarding=refresh`, `${process.env.FRONTEND_URL}/free-trial-teacher-dash?stripe_onboarding=success`);
        return url;
    }
    catch (error) {
        if (error instanceof ApiError_1.default)
            throw error;
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, `Failed to create onboarding link: ${(0, stripe_1.handleStripeError)(error)}`);
    }
});
// Check if freelancer has completed Stripe onboarding
const checkOnboardingStatus = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const stripeAccount = yield payment_model_1.StripeAccount.isExistAccountByUserId(userObjectId);
        if (!stripeAccount) {
            return {
                hasStripeAccount: false,
                isOnboardingComplete: false,
                chargesEnabled: false,
                payoutsEnabled: false,
                detailsSubmitted: false,
            };
        }
        const account = yield (0, stripe_adapter_1.retrieveAccount)(stripeAccount.stripeAccountId);
        const completed = account.charges_enabled && account.payouts_enabled;
        const currentlyDue = (_a = account === null || account === void 0 ? void 0 : account.requirements) === null || _a === void 0 ? void 0 : _a.currently_due;
        if (completed !== stripeAccount.onboardingCompleted) {
            yield payment_model_1.StripeAccount.updateAccountStatus(stripeAccount.userId, {
                onboardingCompleted: completed,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
            });
        }
        return {
            hasStripeAccount: true,
            isOnboardingComplete: completed,
            chargesEnabled: (_b = account.charges_enabled) !== null && _b !== void 0 ? _b : false,
            payoutsEnabled: (_c = account.payouts_enabled) !== null && _c !== void 0 ? _c : false,
            detailsSubmitted: (_d = account.details_submitted) !== null && _d !== void 0 ? _d : false,
            accountId: stripeAccount.stripeAccountId,
            stripeAccountId: stripeAccount.stripeAccountId,
            missing_fields: currentlyDue !== null && currentlyDue !== void 0 ? currentlyDue : undefined,
        };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, `Failed to check onboarding status: ${(0, stripe_1.handleStripeError)(error)}`);
    }
});
// Ensure freelancer is onboarded before allowing escrow actions
const ensureFreelancerOnboarded = (taskerId) => __awaiter(void 0, void 0, void 0, function* () {
    const freelancerStripeAccount = yield payment_model_1.StripeAccount.isExistAccountByUserId(taskerId);
    if (!freelancerStripeAccount || !freelancerStripeAccount.onboardingCompleted) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, 'Freelancer has not completed Stripe onboarding');
    }
    return freelancerStripeAccount;
});
// Get freelancer account or throw
const getFreelancerAccountOrThrow = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const freelancerStripeAccount = yield payment_model_1.StripeAccount.isExistAccountByUserId(userId);
    if (!(freelancerStripeAccount === null || freelancerStripeAccount === void 0 ? void 0 : freelancerStripeAccount.stripeAccountId)) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, 'Freelancer Stripe account not found');
    }
    return freelancerStripeAccount;
});
// Delete a Stripe Connect account
const deleteStripeAccountService = (accountId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield stripe_1.stripe.accounts.del(accountId);
        if (!deleted.deleted) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, 'Failed to delete account');
        }
        return deleted;
    }
    catch (error) {
        throw (0, stripe_1.handleStripeError)(error);
    }
});
// Update local account status from Stripe account.update webhook
const handleAccountUpdated = (account) => __awaiter(void 0, void 0, void 0, function* () {
    const completed = account.charges_enabled && account.payouts_enabled;
    yield payment_model_1.StripeAccount.updateMany({
        stripeAccountId: account.id,
    }, {
        onboardingCompleted: completed,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
    });
});
const StripeConnectService = {
    createStripeAccount,
    createOnboardingLink,
    checkOnboardingStatus,
    ensureFreelancerOnboarded,
    getFreelancerAccountOrThrow,
    deleteStripeAccountService,
    handleAccountUpdated,
};
exports.default = StripeConnectService;
