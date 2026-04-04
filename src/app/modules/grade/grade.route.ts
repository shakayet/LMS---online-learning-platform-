import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { GradeController } from './grade.controller';
import { GradeValidation } from './grade.validation';

const router = express.Router();

router.get('/active', GradeController.getActiveGrades);

router.get('/:gradeId', GradeController.getSingleGrade);

router.get('/', GradeController.getAllGrades);

router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(GradeValidation.createGradeZodSchema),
  GradeController.createGrade
);

router.patch(
  '/:gradeId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(GradeValidation.updateGradeZodSchema),
  GradeController.updateGrade
);

router.delete(
  '/:gradeId',
  auth(USER_ROLES.SUPER_ADMIN),
  GradeController.deleteGrade
);

export const GradeRoutes = router;
