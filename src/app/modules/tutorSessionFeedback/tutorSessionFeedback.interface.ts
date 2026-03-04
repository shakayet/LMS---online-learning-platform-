import { Model, Types } from 'mongoose';

export enum FEEDBACK_TYPE {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
}

export enum FEEDBACK_STATUS {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
}

export type ITutorSessionFeedback = {
  sessionId: Types.ObjectId;
  tutorId: Types.ObjectId;
  studentId: Types.ObjectId;

  // Rating (1-5) - contributes to tutor's overall rating
  rating: number;

  // Feedback (text OR audio) - MANDATORY
  feedbackType: FEEDBACK_TYPE;
  feedbackText?: string; // Required if TEXT (min 10 chars)
  feedbackAudioUrl?: string; // Required if AUDIO (max 60 seconds)
  audioDuration?: number; // Duration in seconds

  // Deadline tracking
  dueDate: Date; // 3rd of next month after session
  submittedAt?: Date;
  isLate: boolean; // True if submitted after dueDate

  // Status
  status: FEEDBACK_STATUS;

  // Payment forfeit tracking (when deadline missed)
  paymentForfeited: boolean;         // true if deadline missed
  forfeitedAmount?: number;          // Amount forfeited to platform
  forfeitedAt?: Date;                // When payment was forfeited
};

export type TutorSessionFeedbackModel = Model<ITutorSessionFeedback>;
