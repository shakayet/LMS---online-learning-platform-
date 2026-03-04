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
exports.User = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const config_1 = __importDefault(require("../../../config"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_interface_1 = require("./user.interface");
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        enum: Object.values(user_interface_1.USER_ROLES),
        default: user_interface_1.USER_ROLES.STUDENT,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false, // hide password by default
    },
    location: {
        type: String,
        trim: true,
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
    },
    dateOfBirth: {
        type: String,
    },
    phone: {
        type: String,
        trim: true,
    },
    profilePicture: {
        type: String,
        default: 'https://i.ibb.co/z5YHLV9/profile.png',
    },
    status: {
        type: String,
        enum: Object.values(user_interface_1.USER_STATUS),
        default: user_interface_1.USER_STATUS.ACTIVE,
    },
    deviceTokens: {
        type: [String],
        default: [],
    },
    averageRating: {
        type: Number,
        default: 0,
    },
    ratingsCount: {
        type: Number,
        default: 0,
    },
    about: {
        type: String,
    },
    achievements: {
        type: [String],
        default: [],
    },
    // Student Profile (for STUDENT role)
    studentProfile: {
        type: {
            schoolType: String,
            grade: String,
            subjects: [String],
            preferredGender: String,
            preferredAgeRange: String,
            hasUsedFreeTrial: {
                type: Boolean,
                default: false,
            },
            hasCompletedTrial: {
                type: Boolean,
                default: false,
            },
            trialRequestsCount: {
                type: Number,
                default: 0,
            },
            sessionRequestsCount: {
                type: Number,
                default: 0,
            },
            currentPlan: {
                type: String,
                enum: ['FLEXIBLE', 'REGULAR', 'LONG_TERM', null],
                default: null,
            },
            totalHoursTaken: {
                type: Number,
                default: 0,
            },
            totalSpent: {
                type: Number,
                default: 0,
            },
            stripeCustomerId: {
                type: String,
            },
            subscriptionTier: {
                type: String,
                enum: ['FLEXIBLE', 'REGULAR', 'LONG_TERM', null],
                default: null,
            },
        },
        default: undefined, // Only set for STUDENT role
    },
    // Tutor Profile (for TUTOR/APPLICANT role)
    tutorProfile: {
        type: {
            address: String,
            birthDate: Date,
            subjects: [
                {
                    type: mongoose_1.Schema.Types.ObjectId,
                    ref: 'Subject',
                },
            ],
            bio: String,
            languages: [String],
            teachingExperience: String,
            education: String,
            cvUrl: String,
            abiturCertificateUrl: String,
            educationProofUrls: [String],
            totalSessions: {
                type: Number,
                default: 0,
            },
            completedSessions: {
                type: Number,
                default: 0,
            },
            totalHoursTaught: {
                type: Number,
                default: 0,
            },
            totalStudents: {
                type: Number,
                default: 0,
            },
            // Level System
            level: {
                type: String,
                enum: ['STARTER', 'INTERMEDIATE', 'EXPERT'],
                default: 'STARTER',
            },
            levelUpdatedAt: {
                type: Date,
            },
            // Earnings
            totalEarnings: {
                type: Number,
                default: 0,
            },
            pendingFeedbackCount: {
                type: Number,
                default: 0,
            },
            // Payout Settings
            payoutRecipient: {
                type: String,
            },
            payoutIban: {
                type: String,
            },
            isVerified: {
                type: Boolean,
                default: false,
            },
            verificationStatus: {
                type: String,
                enum: ['PENDING', 'DOCUMENT_APPROVED', 'INTERVIEW_SCHEDULED', 'APPROVED', 'REJECTED'],
                default: 'PENDING',
            },
            onboardingPhase: {
                type: Number,
                enum: [1, 2, 3],
                default: 1,
            },
            stripeConnectAccountId: String,
            stripeOnboardingCompleted: {
                type: Boolean,
                default: false,
            },
        },
        default: undefined, // Only set for TUTOR/APPLICANT role
    },
    authentication: {
        type: {
            isResetPassword: {
                type: Boolean,
                default: false,
            },
            oneTimeCode: {
                type: Number,
                default: null,
            },
            expireAt: {
                type: Date,
                default: null,
            },
        },
        select: false, // hide auth info by default
    },
}, { timestamps: true });
//exist user check
userSchema.statics.isExistUserById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const isExist = yield exports.User.findById(id);
    return isExist;
});
userSchema.statics.isExistUserByEmail = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const isExist = yield exports.User.findOne({ email });
    return isExist;
});
//is match password
userSchema.statics.isMatchPassword = (password, hashPassword) => __awaiter(void 0, void 0, void 0, function* () {
    return yield bcrypt_1.default.compare(password, hashPassword);
});
//check user
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        //check user - exclude current user from email uniqueness check
        const isExist = yield exports.User.findOne({
            email: this.email,
            _id: { $ne: this._id } // exclude current user
        });
        if (isExist) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Email already exist!');
        }
        //password hash
        this.password = yield bcrypt_1.default.hash(this.password, Number(config_1.default.bcrypt_salt_rounds));
        next();
    });
});
// ✅ add device token
userSchema.statics.addDeviceToken = (userId, token) => __awaiter(void 0, void 0, void 0, function* () {
    return yield exports.User.findByIdAndUpdate(userId, { $addToSet: { deviceTokens: token } }, // prevent duplicates
    { new: true });
});
// ✅ remove device token
userSchema.statics.removeDeviceToken = (userId, token) => __awaiter(void 0, void 0, void 0, function* () {
    return yield exports.User.findByIdAndUpdate(userId, { $pull: { deviceTokens: token } }, { new: true });
});
exports.User = (0, mongoose_1.model)('User', userSchema);
