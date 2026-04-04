import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SubjectController } from './subject.controller';
import { SubjectValidation } from './subject.validation';

const router = express.Router();

router.get('/active', SubjectController.getActiveSubjects);

router.get('/:subjectId', SubjectController.getSingleSubject);

router.get('/', SubjectController.getAllSubjects);

router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SubjectValidation.createSubjectZodSchema),
  SubjectController.createSubject
);

router.patch(
  '/:subjectId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SubjectValidation.updateSubjectZodSchema),
  SubjectController.updateSubject
);

router.delete(
  '/:subjectId',
  auth(USER_ROLES.SUPER_ADMIN),
  SubjectController.deleteSubject
);

export const SubjectRoutes = router;
