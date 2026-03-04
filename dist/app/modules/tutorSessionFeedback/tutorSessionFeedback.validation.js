"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorSessionFeedbackValidation = void 0;
const zod_1 = require("zod");
const tutorSessionFeedback_interface_1 = require("./tutorSessionFeedback.interface");
const createFeedbackZodSchema = zod_1.z
    .object({
    body: zod_1.z.object({
        sessionId: zod_1.z.string({
            required_error: 'Session ID is required',
        }),
        rating: zod_1.z
            .number({
            required_error: 'Rating is required',
        })
            .min(1, 'Rating must be at least 1')
            .max(5, 'Rating cannot exceed 5'),
        feedbackType: zod_1.z.enum([tutorSessionFeedback_interface_1.FEEDBACK_TYPE.TEXT, tutorSessionFeedback_interface_1.FEEDBACK_TYPE.AUDIO], {
            required_error: 'Feedback type is required',
        }),
        feedbackText: zod_1.z
            .string()
            .min(10, 'Feedback text must be at least 10 characters')
            .max(2000, 'Feedback text cannot exceed 2000 characters')
            .optional(),
        feedbackAudioUrl: zod_1.z.string().url('Invalid audio URL').optional(),
        audioDuration: zod_1.z
            .number()
            .max(60, 'Audio duration cannot exceed 60 seconds')
            .optional(),
    }),
})
    .refine(data => {
    if (data.body.feedbackType === tutorSessionFeedback_interface_1.FEEDBACK_TYPE.TEXT) {
        return !!data.body.feedbackText;
    }
    return true;
}, {
    message: 'Feedback text is required for TEXT feedback type',
    path: ['body', 'feedbackText'],
})
    .refine(data => {
    if (data.body.feedbackType === tutorSessionFeedback_interface_1.FEEDBACK_TYPE.AUDIO) {
        return !!data.body.feedbackAudioUrl;
    }
    return true;
}, {
    message: 'Audio URL is required for AUDIO feedback type',
    path: ['body', 'feedbackAudioUrl'],
});
const updateFeedbackZodSchema = zod_1.z
    .object({
    body: zod_1.z.object({
        rating: zod_1.z
            .number()
            .min(1, 'Rating must be at least 1')
            .max(5, 'Rating cannot exceed 5')
            .optional(),
        feedbackType: zod_1.z.enum([tutorSessionFeedback_interface_1.FEEDBACK_TYPE.TEXT, tutorSessionFeedback_interface_1.FEEDBACK_TYPE.AUDIO]).optional(),
        feedbackText: zod_1.z
            .string()
            .min(10, 'Feedback text must be at least 10 characters')
            .max(2000, 'Feedback text cannot exceed 2000 characters')
            .optional(),
        feedbackAudioUrl: zod_1.z.string().url('Invalid audio URL').optional(),
        audioDuration: zod_1.z
            .number()
            .max(60, 'Audio duration cannot exceed 60 seconds')
            .optional(),
    }),
})
    .refine(data => {
    // If feedbackType is being set to TEXT, feedbackText must be provided
    if (data.body.feedbackType === tutorSessionFeedback_interface_1.FEEDBACK_TYPE.TEXT && !data.body.feedbackText) {
        return false;
    }
    return true;
}, {
    message: 'Feedback text is required when changing to TEXT feedback type',
    path: ['body', 'feedbackText'],
})
    .refine(data => {
    // If feedbackType is being set to AUDIO, feedbackAudioUrl must be provided
    if (data.body.feedbackType === tutorSessionFeedback_interface_1.FEEDBACK_TYPE.AUDIO && !data.body.feedbackAudioUrl) {
        return false;
    }
    return true;
}, {
    message: 'Audio URL is required when changing to AUDIO feedback type',
    path: ['body', 'feedbackAudioUrl'],
});
exports.TutorSessionFeedbackValidation = {
    createFeedbackZodSchema,
    updateFeedbackZodSchema,
};
