import { Model, Types } from 'mongoose';

export enum APPLICATION_STATUS {
  SUBMITTED = 'SUBMITTED',
  REVISION = 'REVISION',
  RESUBMITTED = 'RESUBMITTED',
  SELECTED_FOR_INTERVIEW = 'SELECTED_FOR_INTERVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export type ITutorApplication = {
  _id: Types.ObjectId;

  subjects: Types.ObjectId[];
  name: string;
  email: string;
  phoneNumber: string;

  street: string;
  houseNumber: string;
  zip: string;
  city: string;

  birthDate: Date;

  cv: string;
  abiturCertificate: string;
  officialId: string;

  status: APPLICATION_STATUS;
  rejectionReason?: string;
  revisionNote?: string;

  interviewCancelledReason?: string;
  interviewCancelledAt?: Date;

  adminNotes?: string;

  submittedAt: Date;
  resubmittedAt?: Date;
  selectedForInterviewAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  revisionRequestedAt?: Date;
};

export type TutorApplicationModel = Model<ITutorApplication>;
