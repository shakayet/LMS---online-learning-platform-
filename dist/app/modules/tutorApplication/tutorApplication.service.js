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
exports.TutorApplicationService = void 0;
const http_status_codes_1 = require("http-status-codes");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_1 = require("../../../enums/user");
const user_model_1 = require("../user/user.model");
const tutorApplication_interface_1 = require("./tutorApplication.interface");
const tutorApplication_model_1 = require("./tutorApplication.model");
const jwtHelper_1 = require("../../../helpers/jwtHelper");
const config_1 = __importDefault(require("../../../config"));
const activityLog_service_1 = require("../activityLog/activityLog.service");

const submitApplication = (payload) => __awaiter(void 0, void 0, void 0, function* () {

    const existingUser = yield user_model_1.User.findOne({ email: payload.email });
    if (existingUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.CONFLICT, 'Email already registered');
    }

    const existingApplication = yield tutorApplication_model_1.TutorApplication.findOne({
        email: payload.email,
    });
    if (existingApplication) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.CONFLICT, 'An application with this email already exists');
    }

    const newUser = yield user_model_1.User.create({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        phone: payload.phoneNumber,
        role: user_1.USER_ROLES.APPLICANT,
        dateOfBirth: new Date(payload.birthDate),
        tutorProfile: {
            subjects: payload.subjects,
            cvUrl: payload.cv,
            abiturCertificateUrl: payload.abiturCertificate,
        },
    });

    const accessToken = jwtHelper_1.jwtHelper.createToken({ id: newUser._id, role: newUser.role, email: newUser.email }, config_1.default.jwt.jwt_secret, config_1.default.jwt.jwt_expire_in);

    const application = yield tutorApplication_model_1.TutorApplication.create({
        name: payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        birthDate: new Date(payload.birthDate),
        street: payload.street,
        houseNumber: payload.houseNumber,
        zip: payload.zip,
        city: payload.city,
        subjects: payload.subjects,
        cv: payload.cv,
        abiturCertificate: payload.abiturCertificate,
        officialId: payload.officialId,
        status: tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED,
        submittedAt: new Date(),
    });

    activityLog_service_1.ActivityLogService.logActivity({
        userId: newUser._id,
        actionType: 'APPLICATION_SUBMITTED',
        title: 'New Tutor Application',
        description: `${payload.name} submitted a tutor application`,
        entityType: 'APPLICATION',
        entityId: application._id,
        status: 'success',
    });
    return {
        application,
        user: {
            _id: newUser._id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
        },
        accessToken,
    };
});

const getMyApplication = (userEmail, currentUserRole) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findOne({
        email: userEmail,
    }).populate({ path: 'subjects', select: 'name -_id' });
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'No application found');
    }

    let newAccessToken = null;
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.APPROVED &&
        currentUserRole === user_1.USER_ROLES.APPLICANT) {
        const user = yield user_model_1.User.findOne({ email: userEmail });
        if (user && user.role === user_1.USER_ROLES.TUTOR) {
            newAccessToken = jwtHelper_1.jwtHelper.createToken({ id: user._id, role: user.role, email: user.email }, config_1.default.jwt.jwt_secret, config_1.default.jwt.jwt_expire_in);
        }
    }
    return { application, newAccessToken };
});

const getAllApplications = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const applicationQuery = new QueryBuilder_1.default(tutorApplication_model_1.TutorApplication.find(), query)
        .search(['name', 'email', 'phoneNumber', 'city'])
        .filter()
        .sort()
        .paginate()
        .fields();

    applicationQuery.modelQuery = applicationQuery.modelQuery.populate({
        path: 'subjects',
        select: 'name -_id',
    });

    const result = yield applicationQuery.modelQuery;
    const meta = yield applicationQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});

const getSingleApplication = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id).populate({
        path: 'subjects',
        select: 'name -_id',
    });
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    return application;
});

const selectForInterview = (id, adminNotes) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Application is already selected for interview');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.APPROVED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Application is already approved');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.REJECTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot select a rejected application for interview');
    }

    if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED &&
        application.status !== tutorApplication_interface_1.APPLICATION_STATUS.REVISION &&
        application.status !== tutorApplication_interface_1.APPLICATION_STATUS.RESUBMITTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only submitted, revision, or resubmitted applications can be selected for interview');
    }

    application.status = tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW;
    application.selectedForInterviewAt = new Date();
    if (adminNotes) {
        application.adminNotes = adminNotes;
    }
    yield application.save();

    return application;
});

const approveApplication = (id, adminNotes) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.APPROVED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Application is already approved');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.REJECTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot approve a rejected application');
    }

    if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Application must be selected for interview before approval. Please select for interview first.');
    }

    application.status = tutorApplication_interface_1.APPLICATION_STATUS.APPROVED;
    application.approvedAt = new Date();
    if (adminNotes) {
        application.adminNotes = adminNotes;
    }
    yield application.save();

    const fullAddress = `${application.street} ${application.houseNumber}, ${application.zip} ${application.city}`;

    const updatedUser = yield user_model_1.User.findOneAndUpdate({ email: application.email }, {
        role: user_1.USER_ROLES.TUTOR,
        'tutorProfile.isVerified': true,
        'tutorProfile.verificationStatus': 'APPROVED',
        'tutorProfile.subjects': application.subjects,
        'tutorProfile.address': fullAddress,
        'tutorProfile.birthDate': application.birthDate,
        'tutorProfile.cvUrl': application.cv,
        'tutorProfile.abiturCertificateUrl': application.abiturCertificate,
    }, { new: true });

    if (updatedUser) {
        activityLog_service_1.ActivityLogService.logActivity({
            userId: updatedUser._id,
            actionType: 'TUTOR_VERIFIED',
            title: 'Tutor Verified',
            description: `${application.name} has been verified as a tutor`,
            entityType: 'APPLICATION',
            entityId: application._id,
            status: 'success',
        });
    }

    let newAccessToken = null;
    if (updatedUser) {
        newAccessToken = jwtHelper_1.jwtHelper.createToken({ id: updatedUser._id, role: updatedUser.role, email: updatedUser.email }, config_1.default.jwt.jwt_secret, config_1.default.jwt.jwt_expire_in);
    }
    return { application, newAccessToken };
});

const rejectApplication = (id, rejectionReason) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.APPROVED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot reject an approved application');
    }

    application.status = tutorApplication_interface_1.APPLICATION_STATUS.REJECTED;
    application.rejectionReason = rejectionReason;
    application.rejectedAt = new Date();
    yield application.save();

    const user = yield user_model_1.User.findOne({ email: application.email });
    if (user) {
        activityLog_service_1.ActivityLogService.logActivity({
            userId: user._id,
            actionType: 'APPLICATION_REJECTED',
            title: 'Application Rejected',
            description: `${application.name}'s tutor application was rejected`,
            entityType: 'APPLICATION',
            entityId: application._id,
            status: 'warning',
        });
    }
    return application;
});

const sendForRevision = (id, revisionNote) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.APPROVED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot request revision for an approved application');
    }
    if (application.status === tutorApplication_interface_1.APPLICATION_STATUS.REJECTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot request revision for a rejected application');
    }

    application.status = tutorApplication_interface_1.APPLICATION_STATUS.REVISION;
    application.revisionNote = revisionNote;
    application.revisionRequestedAt = new Date();
    yield application.save();

    return application;
});

const deleteApplication = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findById(id);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    const result = yield tutorApplication_model_1.TutorApplication.findByIdAndDelete(id);
    return result;
});

const updateMyApplication = (userEmail, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const application = yield tutorApplication_model_1.TutorApplication.findOne({ email: userEmail });
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }

    if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.REVISION) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You can only update your application when revision is requested');
    }

    if (payload.cv) {
        application.cv = payload.cv;
    }
    if (payload.abiturCertificate) {
        application.abiturCertificate = payload.abiturCertificate;
    }
    if (payload.officialId) {
        application.officialId = payload.officialId;
    }

    application.status = tutorApplication_interface_1.APPLICATION_STATUS.RESUBMITTED;
    application.resubmittedAt = new Date();

    yield user_model_1.User.findOneAndUpdate({ email: userEmail }, {
        'tutorProfile.cvUrl': application.cv,
        'tutorProfile.abiturCertificateUrl': application.abiturCertificate,
    });
    yield application.save();

    const user = yield user_model_1.User.findOne({ email: userEmail });
    if (user) {
        activityLog_service_1.ActivityLogService.logActivity({
            userId: user._id,
            actionType: 'APPLICATION_RESUBMITTED',
            title: 'Application Resubmitted',
            description: `${application.name} resubmitted their tutor application after revision`,
            entityType: 'APPLICATION',
            entityId: application._id,
            status: 'success',
        });
    }
    return application.populate({ path: 'subjects', select: 'name -_id' });
});
exports.TutorApplicationService = {
    submitApplication,
    getMyApplication,
    getAllApplications,
    getSingleApplication,
    selectForInterview,
    approveApplication,
    rejectApplication,
    sendForRevision,
    deleteApplication,
    updateMyApplication,
};
