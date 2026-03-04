import express from 'express';
import { OERResourceController } from './oerResource.controller';
import validateRequest from '../../middlewares/validateRequest';
import { OERResourceValidation } from './oerResource.validation';

const router = express.Router();

// Public routes - no authentication required

// Search OER resources
router.get(
  '/search',
  validateRequest(OERResourceValidation.searchOERResourcesZodSchema),
  OERResourceController.searchResources
);

// Get filter options (subjects, types, grades)
router.get('/filters', OERResourceController.getFilterOptions);

export const OERResourceRoutes = router;
