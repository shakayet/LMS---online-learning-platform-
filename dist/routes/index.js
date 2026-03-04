"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_route_1 = require("../app/modules/auth/auth.route");
const user_route_1 = require("../app/modules/user/user.route");
const chat_route_1 = require("../app/modules/chat/chat.route");
const message_route_1 = require("../app/modules/message/message.route");
const payment_routes_1 = require("../app/modules/payment/payment.routes");
const notification_routes_1 = require("../app/modules/notification/notification.routes");
const subject_route_1 = require("../app/modules/subject/subject.route");
const grade_route_1 = require("../app/modules/grade/grade.route");
const schoolType_route_1 = require("../app/modules/schoolType/schoolType.route");
const tutorApplication_route_1 = require("../app/modules/tutorApplication/tutorApplication.route");
const interviewSlot_route_1 = require("../app/modules/interviewSlot/interviewSlot.route");
const trialRequest_route_1 = require("../app/modules/trialRequest/trialRequest.route");
const sessionRequest_route_1 = require("../app/modules/sessionRequest/sessionRequest.route");
const session_route_1 = require("../app/modules/session/session.route");
const studentSubscription_route_1 = require("../app/modules/studentSubscription/studentSubscription.route");
const monthlyBilling_route_1 = require("../app/modules/monthlyBilling/monthlyBilling.route");
const tutorEarnings_route_1 = require("../app/modules/tutorEarnings/tutorEarnings.route");
const admin_route_1 = require("../app/modules/admin/admin.route");
const sessionReview_route_1 = require("../app/modules/sessionReview/sessionReview.route");
const tutorSessionFeedback_route_1 = require("../app/modules/tutorSessionFeedback/tutorSessionFeedback.route");
const call_route_1 = require("../app/modules/call/call.route");
const whiteboard_route_1 = require("../app/modules/whiteboard/whiteboard.route");
const paymentMethod_route_1 = require("../app/modules/paymentMethod/paymentMethod.route");
const legalPolicy_route_1 = require("../app/modules/legalPolicy/legalPolicy.route");
const oerResource_route_1 = require("../app/modules/oerResource/oerResource.route");
const supportTicket_route_1 = require("../app/modules/supportTicket/supportTicket.route");
const pricingConfig_route_1 = require("../app/modules/pricingConfig/pricingConfig.route");
const router = express_1.default.Router();
const apiRoutes = [
    {
        path: '/user',
        route: user_route_1.UserRoutes,
    },
    {
        path: '/auth',
        route: auth_route_1.AuthRoutes,
    },
    {
        path: '/chats',
        route: chat_route_1.ChatRoutes,
    },
    {
        path: '/messages',
        route: message_route_1.MessageRoutes,
    },
    {
        path: '/payments',
        route: payment_routes_1.PaymentRoutes,
    },
    {
        path: '/notifications',
        route: notification_routes_1.NotificationRoutes,
    },
    {
        path: '/subjects',
        route: subject_route_1.SubjectRoutes,
    },
    {
        path: '/grades',
        route: grade_route_1.GradeRoutes,
    },
    {
        path: '/school-types',
        route: schoolType_route_1.SchoolTypeRoutes,
    },
    {
        path: '/applications',
        route: tutorApplication_route_1.TutorApplicationRoutes,
    },
    {
        path: '/interview-slots',
        route: interviewSlot_route_1.InterviewSlotRoutes,
    },
    {
        path: '/trial-requests',
        route: trialRequest_route_1.TrialRequestRoutes,
    },
    {
        path: '/session-requests',
        route: sessionRequest_route_1.SessionRequestRoutes,
    },
    {
        path: '/sessions',
        route: session_route_1.SessionRoutes,
    },
    {
        path: '/subscriptions',
        route: studentSubscription_route_1.StudentSubscriptionRoutes,
    },
    {
        path: '/billings',
        route: monthlyBilling_route_1.MonthlyBillingRoutes,
    },
    {
        path: '/earnings',
        route: tutorEarnings_route_1.TutorEarningsRoutes,
    },
    {
        path: '/admin',
        route: admin_route_1.AdminRoutes,
    },
    {
        path: '/reviews',
        route: sessionReview_route_1.SessionReviewRoutes,
    },
    {
        path: '/tutor-feedback',
        route: tutorSessionFeedback_route_1.TutorSessionFeedbackRoutes,
    },
    {
        path: '/calls',
        route: call_route_1.CallRoutes,
    },
    {
        path: '/whiteboard',
        route: whiteboard_route_1.WhiteboardRoutes,
    },
    {
        path: '/payment-methods',
        route: paymentMethod_route_1.PaymentMethodRoutes,
    },
    {
        path: '/legal-policies',
        route: legalPolicy_route_1.LegalPolicyRoutes,
    },
    {
        path: '/oer-resources',
        route: oerResource_route_1.OERResourceRoutes,
    },
    {
        path: '/support-tickets',
        route: supportTicket_route_1.SupportTicketRoutes,
    },
    {
        path: '/pricing',
        route: pricingConfig_route_1.PricingConfigRoutes,
    },
];
apiRoutes.forEach(route => router.use(route.path, route.route));
exports.default = router;
