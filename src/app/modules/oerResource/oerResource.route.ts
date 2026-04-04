import express from 'express';
import { OERResourceController } from './oerResource.controller';
import validateRequest from '../../middlewares/validateRequest';
import { OERResourceValidation } from './oerResource.validation';

const router = express.Router();

router.get(
  '/search',
  validateRequest(OERResourceValidation.searchOERResourcesZodSchema),
  OERResourceController.searchResources
);

router.get('/filters', OERResourceController.getFilterOptions);

export const OERResourceRoutes = router;
