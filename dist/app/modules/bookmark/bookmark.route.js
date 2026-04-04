"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookmarkRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const user_1 = require("../../../enums/user");
const bookmark_controller_1 = require("./bookmark.controller");
const bookmark_validation_1 = require("./bookmark.validation");
const router = express_1.default.Router();

router.post('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(bookmark_validation_1.BookmarkValidation.toggle), bookmark_controller_1.BookmarkController.toggleBookmark);

router.get('/my-bookmarks', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(bookmark_validation_1.BookmarkValidation.getUserBookmarksQuery), bookmark_controller_1.BookmarkController.getUserBookmarks);
exports.BookmarkRoutes = router;
