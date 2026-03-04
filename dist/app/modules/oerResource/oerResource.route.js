"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OERResourceRoutes = void 0;
const express_1 = __importDefault(require("express"));
const oerResource_controller_1 = require("./oerResource.controller");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const oerResource_validation_1 = require("./oerResource.validation");
const router = express_1.default.Router();
// Public routes - no authentication required
// Search OER resources
router.get('/search', (0, validateRequest_1.default)(oerResource_validation_1.OERResourceValidation.searchOERResourcesZodSchema), oerResource_controller_1.OERResourceController.searchResources);
// Get filter options (subjects, types, grades)
router.get('/filters', oerResource_controller_1.OERResourceController.getFilterOptions);
exports.OERResourceRoutes = router;
