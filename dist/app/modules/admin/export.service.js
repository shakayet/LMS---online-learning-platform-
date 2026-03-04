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
exports.ExportService = void 0;
const user_model_1 = require("../user/user.model");
const tutorApplication_model_1 = require("../tutorApplication/tutorApplication.model");
const session_model_1 = require("../session/session.model");
const monthlyBilling_model_1 = require("../monthlyBilling/monthlyBilling.model");
const tutorEarnings_model_1 = require("../tutorEarnings/tutorEarnings.model");
const studentSubscription_model_1 = require("../studentSubscription/studentSubscription.model");
const trialRequest_model_1 = require("../trialRequest/trialRequest.model");
/**
 * Convert JSON data to CSV format
 */
const jsonToCSV = (data, headers) => {
    if (!data || data.length === 0) {
        return '';
    }
    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0]);
    // Create header row
    const headerRow = csvHeaders.join(',');
    // Create data rows
    const dataRows = data.map(row => {
        return csvHeaders
            .map(header => {
            const value = row[header];
            // Handle null/undefined
            if (value === null || value === undefined)
                return '';
            // Handle objects/arrays (convert to JSON string)
            if (typeof value === 'object')
                return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            // Handle strings with commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        })
            .join(',');
    });
    return [headerRow, ...dataRows].join('\n');
};
/**
 * Export all users to CSV
 */
const exportUsers = (role) => __awaiter(void 0, void 0, void 0, function* () {
    const query = role ? { role } : {};
    const users = yield user_model_1.User.find(query).select('name email role phone createdAt');
    const data = users.map(user => {
        var _a;
        return ({
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone || 'N/A',
            joinedAt: (_a = user.createdAt) === null || _a === void 0 ? void 0 : _a.toISOString().split('T')[0],
        });
    });
    return jsonToCSV(data);
});
/**
 * Export tutor applications to CSV
 */
const exportApplications = (status) => __awaiter(void 0, void 0, void 0, function* () {
    const query = status ? { status } : {};
    const applications = yield tutorApplication_model_1.TutorApplication.find(query).select('name email status subjects city submittedAt approvedAt rejectedAt');
    const data = applications.map((app) => {
        var _a, _b;
        return ({
            applicantName: app.name || 'N/A',
            applicantEmail: app.email || 'N/A',
            status: app.status,
            subjects: app.subjects.join('; '),
            city: app.city || 'N/A',
            appliedAt: (_a = app.submittedAt) === null || _a === void 0 ? void 0 : _a.toISOString().split('T')[0],
            approvedAt: ((_b = app.approvedAt) === null || _b === void 0 ? void 0 : _b.toISOString().split('T')[0]) || 'N/A',
        });
    });
    return jsonToCSV(data);
});
/**
 * Export sessions to CSV
 */
const exportSessions = (status, startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    const query = {};
    if (status)
        query.status = status;
    if (startDate || endDate) {
        query.startTime = {};
        if (startDate)
            query.startTime.$gte = startDate;
        if (endDate)
            query.startTime.$lte = endDate;
    }
    const sessions = yield session_model_1.Session.find(query)
        .populate('studentId', 'name email')
        .populate('tutorId', 'name email')
        .select('studentId tutorId subject startTime endTime duration pricePerHour totalPrice status completedAt');
    const data = sessions.map(session => {
        var _a, _b, _c, _d, _e;
        return ({
            studentName: ((_a = session.studentId) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            studentEmail: ((_b = session.studentId) === null || _b === void 0 ? void 0 : _b.email) || 'N/A',
            tutorName: ((_c = session.tutorId) === null || _c === void 0 ? void 0 : _c.name) || 'N/A',
            tutorEmail: ((_d = session.tutorId) === null || _d === void 0 ? void 0 : _d.email) || 'N/A',
            subject: session.subject,
            startTime: session.startTime.toISOString(),
            endTime: session.endTime.toISOString(),
            durationMinutes: session.duration,
            pricePerHour: session.pricePerHour,
            totalPrice: session.totalPrice,
            status: session.status,
            completedAt: ((_e = session.completedAt) === null || _e === void 0 ? void 0 : _e.toISOString()) || 'N/A',
        });
    });
    return jsonToCSV(data);
});
/**
 * Export monthly billings to CSV
 */
const exportBillings = (status, year, month) => __awaiter(void 0, void 0, void 0, function* () {
    const query = {};
    if (status)
        query.status = status;
    if (year)
        query.billingYear = year;
    if (month)
        query.billingMonth = month;
    const billings = yield monthlyBilling_model_1.MonthlyBilling.find(query)
        .populate('studentId', 'name email')
        .select('studentId billingMonth billingYear invoiceNumber totalSessions totalHours subtotal tax total status paidAt');
    const data = billings.map(billing => {
        var _a, _b, _c;
        return ({
            studentName: ((_a = billing.studentId) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            studentEmail: ((_b = billing.studentId) === null || _b === void 0 ? void 0 : _b.email) || 'N/A',
            invoiceNumber: billing.invoiceNumber,
            billingPeriod: `${billing.billingYear}-${billing.billingMonth.toString().padStart(2, '0')}`,
            totalSessions: billing.totalSessions,
            totalHours: billing.totalHours.toFixed(2),
            subtotal: billing.subtotal.toFixed(2),
            tax: billing.tax.toFixed(2),
            total: billing.total.toFixed(2),
            status: billing.status,
            paidAt: ((_c = billing.paidAt) === null || _c === void 0 ? void 0 : _c.toISOString().split('T')[0]) || 'N/A',
        });
    });
    return jsonToCSV(data);
});
/**
 * Export tutor earnings to CSV
 */
const exportEarnings = (status, year, month) => __awaiter(void 0, void 0, void 0, function* () {
    const query = {};
    if (status)
        query.status = status;
    if (year)
        query.payoutYear = year;
    if (month)
        query.payoutMonth = month;
    const earnings = yield tutorEarnings_model_1.TutorEarnings.find(query)
        .populate('tutorId', 'name email')
        .select('tutorId payoutMonth payoutYear payoutReference totalSessions totalHours grossEarnings platformCommission netEarnings status paidAt');
    const data = earnings.map(earning => {
        var _a, _b, _c;
        return ({
            tutorName: ((_a = earning.tutorId) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            tutorEmail: ((_b = earning.tutorId) === null || _b === void 0 ? void 0 : _b.email) || 'N/A',
            payoutReference: earning.payoutReference,
            payoutPeriod: `${earning.payoutYear}-${earning.payoutMonth.toString().padStart(2, '0')}`,
            totalSessions: earning.totalSessions,
            totalHours: earning.totalHours.toFixed(2),
            grossEarnings: earning.grossEarnings.toFixed(2),
            platformCommission: earning.platformCommission.toFixed(2),
            netEarnings: earning.netEarnings.toFixed(2),
            status: earning.status,
            paidAt: ((_c = earning.paidAt) === null || _c === void 0 ? void 0 : _c.toISOString().split('T')[0]) || 'N/A',
        });
    });
    return jsonToCSV(data);
});
/**
 * Export subscriptions to CSV
 */
const exportSubscriptions = (status) => __awaiter(void 0, void 0, void 0, function* () {
    const query = status ? { status } : {};
    const subscriptions = yield studentSubscription_model_1.StudentSubscription.find(query)
        .populate('studentId', 'name email')
        .select('studentId tier pricePerHour status startDate endDate createdAt');
    const data = subscriptions.map(sub => {
        var _a, _b, _c, _d, _e;
        return ({
            studentName: ((_a = sub.studentId) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            studentEmail: ((_b = sub.studentId) === null || _b === void 0 ? void 0 : _b.email) || 'N/A',
            tier: sub.tier,
            pricePerHour: sub.pricePerHour,
            status: sub.status,
            startDate: ((_c = sub.startDate) === null || _c === void 0 ? void 0 : _c.toISOString().split('T')[0]) || 'N/A',
            endDate: ((_d = sub.endDate) === null || _d === void 0 ? void 0 : _d.toISOString().split('T')[0]) || 'N/A',
            createdAt: (_e = sub.createdAt) === null || _e === void 0 ? void 0 : _e.toISOString().split('T')[0],
        });
    });
    return jsonToCSV(data);
});
/**
 * Export trial requests to CSV
 */
const exportTrialRequests = (status) => __awaiter(void 0, void 0, void 0, function* () {
    const query = status ? { status } : {};
    const requests = yield trialRequest_model_1.TrialRequest.find(query)
        .populate('studentId', 'name email')
        .populate('acceptedTutorId', 'name email')
        .populate('subject', 'name');
    const data = requests.map(req => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        return ({
            studentName: ((_a = req.studentInfo) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            studentEmail: ((_b = req.studentInfo) === null || _b === void 0 ? void 0 : _b.email) || 'N/A',
            isUnder18: ((_c = req.studentInfo) === null || _c === void 0 ? void 0 : _c.isUnder18) ? 'Yes' : 'No',
            guardianName: ((_e = (_d = req.studentInfo) === null || _d === void 0 ? void 0 : _d.guardianInfo) === null || _e === void 0 ? void 0 : _e.name) || 'N/A',
            guardianEmail: ((_g = (_f = req.studentInfo) === null || _f === void 0 ? void 0 : _f.guardianInfo) === null || _g === void 0 ? void 0 : _g.email) || 'N/A',
            guardianPhone: ((_j = (_h = req.studentInfo) === null || _h === void 0 ? void 0 : _h.guardianInfo) === null || _j === void 0 ? void 0 : _j.phone) || 'N/A',
            subject: ((_k = req.subject) === null || _k === void 0 ? void 0 : _k.name) || 'N/A',
            gradeLevel: req.gradeLevel || 'N/A',
            schoolType: req.schoolType || 'N/A',
            status: req.status,
            acceptedTutorName: ((_l = req.acceptedTutorId) === null || _l === void 0 ? void 0 : _l.name) || 'N/A',
            acceptedTutorEmail: ((_m = req.acceptedTutorId) === null || _m === void 0 ? void 0 : _m.email) || 'N/A',
            createdAt: ((_o = req.createdAt) === null || _o === void 0 ? void 0 : _o.toISOString().split('T')[0]) || 'N/A',
            expiresAt: ((_p = req.expiresAt) === null || _p === void 0 ? void 0 : _p.toISOString().split('T')[0]) || 'N/A',
        });
    });
    return jsonToCSV(data);
});
exports.ExportService = {
    exportUsers,
    exportApplications,
    exportSessions,
    exportBillings,
    exportEarnings,
    exportSubscriptions,
    exportTrialRequests,
};
