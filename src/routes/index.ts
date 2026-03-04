import express from 'express';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { UserRoutes } from '../app/modules/user/user.route';
import { ChatRoutes } from '../app/modules/chat/chat.route';
import { MessageRoutes } from '../app/modules/message/message.route';
import { PaymentRoutes } from '../app/modules/payment/payment.routes';
import { NotificationRoutes } from '../app/modules/notification/notification.routes';
import { SubjectRoutes } from '../app/modules/subject/subject.route';
import { GradeRoutes } from '../app/modules/grade/grade.route';
import { SchoolTypeRoutes } from '../app/modules/schoolType/schoolType.route';
import { TutorApplicationRoutes } from '../app/modules/tutorApplication/tutorApplication.route';
import { InterviewSlotRoutes } from '../app/modules/interviewSlot/interviewSlot.route';
import { TrialRequestRoutes } from '../app/modules/trialRequest/trialRequest.route';
import { SessionRequestRoutes } from '../app/modules/sessionRequest/sessionRequest.route';
import { SessionRoutes } from '../app/modules/session/session.route';
import { StudentSubscriptionRoutes } from '../app/modules/studentSubscription/studentSubscription.route';
import { MonthlyBillingRoutes } from '../app/modules/monthlyBilling/monthlyBilling.route';
import { TutorEarningsRoutes } from '../app/modules/tutorEarnings/tutorEarnings.route';
import { AdminRoutes } from '../app/modules/admin/admin.route';
import { SessionReviewRoutes } from '../app/modules/sessionReview/sessionReview.route';
import { TutorSessionFeedbackRoutes } from '../app/modules/tutorSessionFeedback/tutorSessionFeedback.route';
import { CallRoutes } from '../app/modules/call/call.route';
import { WhiteboardRoutes } from '../app/modules/whiteboard/whiteboard.route';
import { PaymentMethodRoutes } from '../app/modules/paymentMethod/paymentMethod.route';
import { LegalPolicyRoutes } from '../app/modules/legalPolicy/legalPolicy.route';
import { OERResourceRoutes } from '../app/modules/oerResource/oerResource.route';
import { SupportTicketRoutes } from '../app/modules/supportTicket/supportTicket.route';
import { PricingConfigRoutes } from '../app/modules/pricingConfig/pricingConfig.route';

const router = express.Router();

const apiRoutes = [
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/chats',
    route: ChatRoutes,
  },
  {
    path: '/messages',
    route: MessageRoutes,
  },
  {
    path: '/payments',
    route: PaymentRoutes,
  },
  {
    path: '/notifications',
    route: NotificationRoutes,
  },
  {
    path: '/subjects',
    route: SubjectRoutes,
  },
  {
    path: '/grades',
    route: GradeRoutes,
  },
  {
    path: '/school-types',
    route: SchoolTypeRoutes,
  },
  {
    path: '/applications',
    route: TutorApplicationRoutes,
  },
  {
    path: '/interview-slots',
    route: InterviewSlotRoutes,
  },
  {
    path: '/trial-requests',
    route: TrialRequestRoutes,
  },
  {
    path: '/session-requests',
    route: SessionRequestRoutes,
  },
  {
    path: '/sessions',
    route: SessionRoutes,
  },
  {
    path: '/subscriptions',
    route: StudentSubscriptionRoutes,
  },
  {
    path: '/billings',
    route: MonthlyBillingRoutes,
  },
  {
    path: '/earnings',
    route: TutorEarningsRoutes,
  },
  {
    path: '/admin',
    route: AdminRoutes,
  },
  {
    path: '/reviews',
    route: SessionReviewRoutes,
  },
  {
    path: '/tutor-feedback',
    route: TutorSessionFeedbackRoutes,
  },
  {
    path: '/calls',
    route: CallRoutes,
  },
  {
    path: '/whiteboard',
    route: WhiteboardRoutes,
  },
  {
    path: '/payment-methods',
    route: PaymentMethodRoutes,
  },
  {
    path: '/legal-policies',
    route: LegalPolicyRoutes,
  },
  {
    path: '/oer-resources',
    route: OERResourceRoutes,
  },
  {
    path: '/support-tickets',
    route: SupportTicketRoutes,
  },
  {
    path: '/pricing',
    route: PricingConfigRoutes,
  },
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;
