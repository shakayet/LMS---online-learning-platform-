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

  rating: number;

  feedbackType: FEEDBACK_TYPE;
  feedbackText?: string;
  feedbackAudioUrl?: string;
  audioDuration?: number;

  dueDate: Date;
  submittedAt?: Date;
  isLate: boolean;

  status: FEEDBACK_STATUS;

  paymentForfeited: boolean;
  forfeitedAmount?: number;
  forfeitedAt?: Date;
};

export type TutorSessionFeedbackModel = Model<ITutorSessionFeedback>;
