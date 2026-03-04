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
exports.UserService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const user_1 = require("../../../enums/user");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const emailHelper_1 = require("../../../helpers/emailHelper");
const emailTemplate_1 = require("../../../shared/emailTemplate");
const unlinkFile_1 = __importDefault(require("../../../shared/unlinkFile"));
const generateOTP_1 = __importDefault(require("../../../util/generateOTP"));
const user_model_1 = require("./user.model");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const user_interface_1 = require("./user.interface");
const session_model_1 = require("../session/session.model");
const session_interface_1 = require("../session/session.interface");
const tutorEarnings_model_1 = require("../tutorEarnings/tutorEarnings.model");
const tutorSessionFeedback_model_1 = require("../tutorSessionFeedback/tutorSessionFeedback.model");
const tutorSessionFeedback_interface_1 = require("../tutorSessionFeedback/tutorSessionFeedback.interface");
const activityLog_service_1 = require("../activityLog/activityLog.service");
const createUserToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const createUser = yield user_model_1.User.create(payload);
    if (!createUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create user');
    }
    // Log activity for user registration
    const roleLabel = createUser.role === user_1.USER_ROLES.STUDENT ? 'Student' :
        createUser.role === user_1.USER_ROLES.TUTOR ? 'Tutor' : 'User';
    activityLog_service_1.ActivityLogService.logActivity({
        userId: createUser._id,
        actionType: 'USER_REGISTERED',
        title: `New ${roleLabel} Registered`,
        description: `${createUser.name} joined the platform as a ${roleLabel.toLowerCase()}`,
        entityType: 'USER',
        entityId: createUser._id,
        status: 'success',
    });
    // NOTE: Email verification temporarily disabled
    // Uncomment below to re-enable OTP email verification
    /*
    //send email
    const otp = generateOTP();
    const values = {
      name: createUser.name,
      otp: otp,
      email: createUser.email!,
    };
    console.log('Sending email to:', createUser.email, 'with OTP:', otp);
  
    const createAccountTemplate = emailTemplate.createAccount(values);
    emailHelper.sendEmail(createAccountTemplate);
  
    //save to DB
    const authentication = {
      oneTimeCode: otp,
      expireAt: new Date(Date.now() + 3 * 60000),
    };
    await User.findOneAndUpdate(
      { _id: createUser._id },
      { $set: { authentication } }
    );
    */
    return createUser;
});
const getUserProfileFromDB = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = user;
    const isExistUser = yield user_model_1.User.findById(id)
        .populate('tutorProfile.subjects', 'name');
    if (!isExistUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    return isExistUser;
});
const updateProfileToDB = (user, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = user;
    const isExistUser = yield user_model_1.User.isExistUserById(id);
    if (!isExistUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    // //unlink file here
    // if (payload.image) {
    //   unlinkFile(isExistUser.image);
    // }
    //unlink file here
    if (payload.profilePicture) {
        (0, unlinkFile_1.default)(isExistUser.profilePicture);
    }
    const updateDoc = yield user_model_1.User.findOneAndUpdate({ _id: id }, payload, {
        new: true,
    });
    return updateDoc;
});
const getAllUsers = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const userQuery = new QueryBuilder_1.default(user_model_1.User.find(), query)
        .search(['name', 'email'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const users = yield userQuery.modelQuery;
    const paginationInfo = yield userQuery.getPaginationInfo();
    return {
        pagination: paginationInfo,
        data: users,
    };
});
const resendVerifyEmailToDB = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const isExistUser = yield user_model_1.User.findOne({ email });
    if (!isExistUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    // Generate new OTP
    const otp = (0, generateOTP_1.default)();
    // Save OTP to DB
    const authentication = {
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60000), // 3 minutes
    };
    yield user_model_1.User.findOneAndUpdate({ email }, { $set: { authentication } });
    // Send email
    const emailData = emailTemplate_1.emailTemplate.createAccount({
        name: isExistUser.name,
        email: isExistUser.email,
        otp,
    });
    yield emailHelper_1.emailHelper.sendEmail(emailData);
    return { otp }; // optional: just for logging/debugging
});
const updateUserStatus = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.isExistUserById(id);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    const updatedUser = yield user_model_1.User.findByIdAndUpdate(id, { status }, { new: true });
    return updatedUser;
});
const getUserById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    // Only return user info; remove task/bid side data
    const user = yield user_model_1.User.findById(id)
        .select('-password -authentication')
        .populate({
        path: 'tutorProfile.subjects',
        select: 'name _id',
    });
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User doesn't exist!");
    }
    return user;
});
const getUserDetailsById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(id).select('-password -authentication');
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User doesn't exist!");
    }
    return user;
});
// ============ ADMIN: STUDENT MANAGEMENT ============
const getAllStudents = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const studentQuery = new QueryBuilder_1.default(user_model_1.User.find({ role: user_1.USER_ROLES.STUDENT }).select('-password -authentication'), query)
        .search(['name', 'email'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const students = yield studentQuery.modelQuery;
    const paginationInfo = yield studentQuery.getPaginationInfo();
    return {
        pagination: paginationInfo,
        data: students,
    };
});
const blockStudent = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(id);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User doesn't exist!");
    }
    if (user.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'User is not a student');
    }
    if (user.status === user_1.USER_STATUS.RESTRICTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Student is already blocked');
    }
    const updatedUser = yield user_model_1.User.findByIdAndUpdate(id, { status: user_1.USER_STATUS.RESTRICTED }, { new: true }).select('-password -authentication');
    return updatedUser;
});
const unblockStudent = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(id);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User doesn't exist!");
    }
    if (user.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'User is not a student');
    }
    if (user.status === user_1.USER_STATUS.ACTIVE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Student is already active');
    }
    const updatedUser = yield user_model_1.User.findByIdAndUpdate(id, { status: user_1.USER_STATUS.ACTIVE }, { new: true }).select('-password -authentication');
    return updatedUser;
});
// ============ ADMIN: TUTOR MANAGEMENT ============
const getAllTutors = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorQuery = new QueryBuilder_1.default(user_model_1.User.find({ role: user_1.USER_ROLES.TUTOR })
        .select('-password -authentication')
        .populate({
        path: 'tutorProfile.subjects',
        select: 'name _id',
    }), query)
        .search(['name', 'email'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const tutors = yield tutorQuery.modelQuery;
    const paginationInfo = yield tutorQuery.getPaginationInfo();
    return {
        pagination: paginationInfo,
        data: tutors,
    };
});
const blockTutor = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(id);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User doesn't exist!");
    }
    if (user.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'User is not a tutor');
    }
    if (user.status === user_1.USER_STATUS.RESTRICTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Tutor is already blocked');
    }
    const updatedUser = yield user_model_1.User.findByIdAndUpdate(id, { status: user_1.USER_STATUS.RESTRICTED }, { new: true }).select('-password -authentication');
    return updatedUser;
});
const unblockTutor = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(id);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User doesn't exist!");
    }
    if (user.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'User is not a tutor');
    }
    if (user.status === user_1.USER_STATUS.ACTIVE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Tutor is already active');
    }
    const updatedUser = yield user_model_1.User.findByIdAndUpdate(id, { status: user_1.USER_STATUS.ACTIVE }, { new: true }).select('-password -authentication');
    return updatedUser;
});
const updateTutorSubjects = (id, subjects) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(id);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User doesn't exist!");
    }
    if (user.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'User is not a tutor');
    }
    const updatedUser = yield user_model_1.User.findByIdAndUpdate(id, { 'tutorProfile.subjects': subjects }, { new: true }).select('-password -authentication');
    return updatedUser;
});
const adminUpdateTutorProfile = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(id);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User doesn't exist!");
    }
    if (user.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'User is not a tutor');
    }
    // Build update object
    const updateData = {};
    // Update basic fields
    if (payload.name)
        updateData.name = payload.name;
    if (payload.email)
        updateData.email = payload.email;
    if (payload.phone !== undefined)
        updateData.phone = payload.phone;
    if (payload.dateOfBirth)
        updateData.dateOfBirth = payload.dateOfBirth;
    if (payload.location)
        updateData.location = payload.location;
    // Update tutor profile fields
    if (payload.tutorProfile) {
        const tp = payload.tutorProfile;
        if (tp.address !== undefined)
            updateData['tutorProfile.address'] = tp.address;
        if (tp.birthDate !== undefined)
            updateData['tutorProfile.birthDate'] = tp.birthDate;
        if (tp.bio !== undefined)
            updateData['tutorProfile.bio'] = tp.bio;
        if (tp.languages !== undefined)
            updateData['tutorProfile.languages'] = tp.languages;
        if (tp.teachingExperience !== undefined)
            updateData['tutorProfile.teachingExperience'] = tp.teachingExperience;
        if (tp.education !== undefined)
            updateData['tutorProfile.education'] = tp.education;
        if (tp.subjects !== undefined)
            updateData['tutorProfile.subjects'] = tp.subjects;
    }
    const updatedUser = yield user_model_1.User.findByIdAndUpdate(id, { $set: updateData }, { new: true })
        .select('-password -authentication')
        .populate({
        path: 'tutorProfile.subjects',
        select: 'name _id',
    });
    return updatedUser;
});
const adminUpdateStudentProfile = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(id);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User doesn't exist!");
    }
    if (user.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'User is not a student');
    }
    // Build update object
    const updateData = {};
    // Update basic fields
    if (payload.name)
        updateData.name = payload.name;
    if (payload.email)
        updateData.email = payload.email;
    if (payload.phone !== undefined)
        updateData.phone = payload.phone;
    if (payload.dateOfBirth)
        updateData.dateOfBirth = payload.dateOfBirth;
    if (payload.location)
        updateData.location = payload.location;
    const updatedUser = yield user_model_1.User.findByIdAndUpdate(id, { $set: updateData }, { new: true }).select('-password -authentication');
    return updatedUser;
});
// ============ TUTOR STATISTICS ============
/**
 * Calculate tutor level based on completed sessions
 */
const calculateTutorLevel = (completedSessions) => {
    if (completedSessions >= 51) {
        return user_interface_1.TUTOR_LEVEL.EXPERT;
    }
    else if (completedSessions >= 21) {
        return user_interface_1.TUTOR_LEVEL.INTERMEDIATE;
    }
    return user_interface_1.TUTOR_LEVEL.STARTER;
};
/**
 * Get sessions to next level
 */
const getSessionsToNextLevel = (completedSessions, currentLevel) => {
    switch (currentLevel) {
        case user_interface_1.TUTOR_LEVEL.STARTER:
            return 21 - completedSessions; // Need 21 for INTERMEDIATE
        case user_interface_1.TUTOR_LEVEL.INTERMEDIATE:
            return 51 - completedSessions; // Need 51 for EXPERT
        case user_interface_1.TUTOR_LEVEL.EXPERT:
            return null; // Already at max level
        default:
            return null;
    }
};
/**
 * Get comprehensive tutor statistics
 */
const getTutorStatistics = (tutorId) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify tutor exists
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
    }
    // Get session stats
    const sessionStats = yield session_model_1.Session.aggregate([
        {
            $match: {
                tutorId: new mongoose_1.Types.ObjectId(tutorId),
            },
        },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                completedSessions: {
                    $sum: { $cond: [{ $eq: ['$status', session_interface_1.SESSION_STATUS.COMPLETED] }, 1, 0] },
                },
                totalHours: {
                    $sum: {
                        $cond: [
                            { $eq: ['$status', session_interface_1.SESSION_STATUS.COMPLETED] },
                            { $divide: ['$duration', 60] },
                            0,
                        ],
                    },
                },
                uniqueStudents: { $addToSet: '$studentId' },
            },
        },
        {
            $project: {
                totalSessions: 1,
                completedSessions: 1,
                totalHours: 1,
                totalStudents: { $size: '$uniqueStudents' },
            },
        },
    ]);
    const stats = sessionStats[0] || {
        totalSessions: 0,
        completedSessions: 0,
        totalHours: 0,
        totalStudents: 0,
    };
    // Get earnings
    const earningsStats = yield tutorEarnings_model_1.TutorEarnings.aggregate([
        {
            $match: {
                tutorId: new mongoose_1.Types.ObjectId(tutorId),
            },
        },
        {
            $group: {
                _id: null,
                totalEarnings: {
                    $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$netEarnings', 0] },
                },
                pendingEarnings: {
                    $sum: {
                        $cond: [{ $in: ['$status', ['PENDING', 'PROCESSING']] }, '$netEarnings', 0],
                    },
                },
            },
        },
    ]);
    const earnings = earningsStats[0] || {
        totalEarnings: 0,
        pendingEarnings: 0,
    };
    // Get pending feedback count
    const pendingFeedbackCount = yield tutorSessionFeedback_model_1.TutorSessionFeedback.countDocuments({
        tutorId: new mongoose_1.Types.ObjectId(tutorId),
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.PENDING,
    });
    // Get overdue feedback count
    const now = new Date();
    const overdueFeedbackCount = yield tutorSessionFeedback_model_1.TutorSessionFeedback.countDocuments({
        tutorId: new mongoose_1.Types.ObjectId(tutorId),
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.PENDING,
        dueDate: { $lt: now },
    });
    // Calculate level
    const currentLevel = calculateTutorLevel(stats.completedSessions);
    const sessionsToNextLevel = getSessionsToNextLevel(stats.completedSessions, currentLevel);
    // Determine next level
    let nextLevel = null;
    if (currentLevel === user_interface_1.TUTOR_LEVEL.STARTER) {
        nextLevel = user_interface_1.TUTOR_LEVEL.INTERMEDIATE;
    }
    else if (currentLevel === user_interface_1.TUTOR_LEVEL.INTERMEDIATE) {
        nextLevel = user_interface_1.TUTOR_LEVEL.EXPERT;
    }
    return {
        currentLevel,
        sessionsToNextLevel,
        nextLevel,
        totalSessions: stats.totalSessions,
        completedSessions: stats.completedSessions,
        totalHoursTaught: Math.round(stats.totalHours * 10) / 10,
        totalStudents: stats.totalStudents,
        averageRating: tutor.averageRating || 0,
        ratingsCount: tutor.ratingsCount || 0,
        totalEarnings: earnings.totalEarnings,
        pendingEarnings: earnings.pendingEarnings,
        pendingFeedbackCount,
        overdueFeedbackCount,
    };
});
/**
 * Update tutor level after session completion
 */
const updateTutorLevelAfterSession = (tutorId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        return;
    }
    // Get completed sessions count
    const completedSessions = yield session_model_1.Session.countDocuments({
        tutorId: new mongoose_1.Types.ObjectId(tutorId),
        status: session_interface_1.SESSION_STATUS.COMPLETED,
    });
    // Calculate new level
    const newLevel = calculateTutorLevel(completedSessions);
    // Update if level changed
    if (((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.level) !== newLevel) {
        yield user_model_1.User.findByIdAndUpdate(tutorId, {
            'tutorProfile.level': newLevel,
            'tutorProfile.levelUpdatedAt': new Date(),
            'tutorProfile.completedSessions': completedSessions,
        });
    }
    else {
        // Just update the session count
        yield user_model_1.User.findByIdAndUpdate(tutorId, {
            'tutorProfile.completedSessions': completedSessions,
        });
    }
});
exports.UserService = {
    createUserToDB,
    getUserProfileFromDB,
    updateProfileToDB,
    getAllUsers,
    resendVerifyEmailToDB,
    updateUserStatus,
    getUserById,
    getUserDetailsById,
    // Admin: Student Management
    getAllStudents,
    blockStudent,
    unblockStudent,
    adminUpdateStudentProfile,
    // Admin: Tutor Management
    getAllTutors,
    blockTutor,
    unblockTutor,
    updateTutorSubjects,
    adminUpdateTutorProfile,
    // Tutor Statistics
    getTutorStatistics,
    updateTutorLevelAfterSession,
    calculateTutorLevel,
};
