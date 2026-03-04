import { z } from 'zod';
import { FEEDBACK_TYPE } from './tutorSessionFeedback.interface';

const createFeedbackZodSchema = z
  .object({
    body: z.object({
      sessionId: z.string({
        required_error: 'Session ID is required',
      }),
      rating: z
        .number({
          required_error: 'Rating is required',
        })
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating cannot exceed 5'),
      feedbackType: z.enum([FEEDBACK_TYPE.TEXT, FEEDBACK_TYPE.AUDIO], {
        required_error: 'Feedback type is required',
      }),
      feedbackText: z
        .string()
        .min(10, 'Feedback text must be at least 10 characters')
        .max(2000, 'Feedback text cannot exceed 2000 characters')
        .optional(),
      feedbackAudioUrl: z.string().url('Invalid audio URL').optional(),
      audioDuration: z
        .number()
        .max(60, 'Audio duration cannot exceed 60 seconds')
        .optional(),
    }),
  })
  .refine(
    data => {
      if (data.body.feedbackType === FEEDBACK_TYPE.TEXT) {
        return !!data.body.feedbackText;
      }
      return true;
    },
    {
      message: 'Feedback text is required for TEXT feedback type',
      path: ['body', 'feedbackText'],
    }
  )
  .refine(
    data => {
      if (data.body.feedbackType === FEEDBACK_TYPE.AUDIO) {
        return !!data.body.feedbackAudioUrl;
      }
      return true;
    },
    {
      message: 'Audio URL is required for AUDIO feedback type',
      path: ['body', 'feedbackAudioUrl'],
    }
  );

const updateFeedbackZodSchema = z
  .object({
    body: z.object({
      rating: z
        .number()
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating cannot exceed 5')
        .optional(),
      feedbackType: z.enum([FEEDBACK_TYPE.TEXT, FEEDBACK_TYPE.AUDIO]).optional(),
      feedbackText: z
        .string()
        .min(10, 'Feedback text must be at least 10 characters')
        .max(2000, 'Feedback text cannot exceed 2000 characters')
        .optional(),
      feedbackAudioUrl: z.string().url('Invalid audio URL').optional(),
      audioDuration: z
        .number()
        .max(60, 'Audio duration cannot exceed 60 seconds')
        .optional(),
    }),
  })
  .refine(
    data => {
      // If feedbackType is being set to TEXT, feedbackText must be provided
      if (data.body.feedbackType === FEEDBACK_TYPE.TEXT && !data.body.feedbackText) {
        return false;
      }
      return true;
    },
    {
      message: 'Feedback text is required when changing to TEXT feedback type',
      path: ['body', 'feedbackText'],
    }
  )
  .refine(
    data => {
      // If feedbackType is being set to AUDIO, feedbackAudioUrl must be provided
      if (data.body.feedbackType === FEEDBACK_TYPE.AUDIO && !data.body.feedbackAudioUrl) {
        return false;
      }
      return true;
    },
    {
      message: 'Audio URL is required when changing to AUDIO feedback type',
      path: ['body', 'feedbackAudioUrl'],
    }
  );

export const TutorSessionFeedbackValidation = {
  createFeedbackZodSchema,
  updateFeedbackZodSchema,
};
