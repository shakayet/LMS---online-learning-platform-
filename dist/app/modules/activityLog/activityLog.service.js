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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogService = void 0;
const activityLog_model_1 = require("./activityLog.model");
// Log a new activity
const logActivity = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield activityLog_model_1.ActivityLog.create({
            userId: data.userId,
            actionType: data.actionType,
            title: data.title,
            description: data.description,
            entityType: data.entityType,
            entityId: data.entityId,
            metadata: data.metadata || {},
            status: data.status || 'success',
        });
    }
    catch (error) {
        // Log error but don't throw - activity logging should not break main flow
        console.error('Failed to log activity:', error);
    }
});
// Get recent activities with pagination and filters
const getRecentActivities = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100); // Max 100
    const skip = (page - 1) * limit;
    // Build filter
    const filter = {};
    if (query.actionType) {
        const actionTypes = query.actionType.split(',');
        filter.actionType = { $in: actionTypes };
    }
    if (query.status) {
        const statuses = query.status.split(',');
        filter.status = { $in: statuses };
    }
    if (query.entityType) {
        filter.entityType = query.entityType;
    }
    if (query.startDate || query.endDate) {
        filter.createdAt = {};
        if (query.startDate) {
            filter.createdAt.$gte = new Date(query.startDate);
        }
        if (query.endDate) {
            filter.createdAt.$lte = new Date(query.endDate);
        }
    }
    // Get total count
    const total = yield activityLog_model_1.ActivityLog.countDocuments(filter);
    // Get activities with user population
    const activities = yield activityLog_model_1.ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email profilePicture')
        .lean();
    // Transform response
    const data = activities.map(activity => {
        var _a;
        const user = activity.userId;
        return {
            _id: String(activity._id),
            userId: user ? String(user._id) : undefined,
            userName: user === null || user === void 0 ? void 0 : user.name,
            userAvatar: user === null || user === void 0 ? void 0 : user.profilePicture,
            actionType: activity.actionType,
            title: activity.title,
            description: activity.description,
            entityType: activity.entityType,
            entityId: activity.entityId ? String(activity.entityId) : undefined,
            status: activity.status,
            createdAt: ((_a = activity.createdAt) === null || _a === void 0 ? void 0 : _a.toISOString()) || new Date().toISOString(),
        };
    });
    return {
        data,
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
    };
});
// Get activity statistics
const getActivityStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalActivities, activitiesToday, byType] = yield Promise.all([
        activityLog_model_1.ActivityLog.countDocuments(),
        activityLog_model_1.ActivityLog.countDocuments({ createdAt: { $gte: today } }),
        activityLog_model_1.ActivityLog.aggregate([
            { $group: { _id: '$actionType', count: { $sum: 1 } } },
        ]),
    ]);
    const activitiesByType = {};
    byType.forEach(item => {
        activitiesByType[item._id] = item.count;
    });
    return {
        totalActivities,
        activitiesByType,
        activitiesToday,
    };
});
exports.ActivityLogService = {
    logActivity,
    getRecentActivities,
    getActivityStats,
};
