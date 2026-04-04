import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { fileHandler } from '../../middlewares/fileHandler';
import validateRequest from '../../middlewares/validateRequest';
import { TutorApplicationController } from './tutorApplication.controller';
import { TutorApplicationValidation } from './tutorApplication.validation';

const router = express.Router();

router.post(
  '/',
  fileHandler([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
  ]),
  validateRequest(TutorApplicationValidation.createApplicationZodSchema),
  TutorApplicationController.submitApplication
);

router.get(
  '/my-application',
  auth(USER_ROLES.APPLICANT),
  TutorApplicationController.getMyApplication
);

router.patch(
  '/my-application',
  auth(USER_ROLES.APPLICANT),
  fileHandler([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
  ]),
  validateRequest(TutorApplicationValidation.updateMyApplicationZodSchema),
  TutorApplicationController.updateMyApplication
);

router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.getAllApplications
);

router.get(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.getSingleApplication
);

router.patch(
  '/:id/select-for-interview',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.selectForInterviewZodSchema),
  TutorApplicationController.selectForInterview
);

router.patch(
  '/:id/approve',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.approveApplicationZodSchema),
  TutorApplicationController.approveApplication
);

router.patch(
  '/:id/reject',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.rejectApplicationZodSchema),
  TutorApplicationController.rejectApplication
);

router.patch(
  '/:id/revision',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.sendForRevisionZodSchema),
  TutorApplicationController.sendForRevision
);

router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.deleteApplication
);

export const TutorApplicationRoutes = router;
