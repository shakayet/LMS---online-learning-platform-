import { Model, Types } from 'mongoose';

// Application status flow: SUBMITTED → SELECTED_FOR_INTERVIEW → APPROVED/REJECTED
export enum APPLICATION_STATUS {
  SUBMITTED = 'SUBMITTED',
  REVISION = 'REVISION', // Admin requests changes
  RESUBMITTED = 'RESUBMITTED', // Applicant resubmitted after revision
  SELECTED_FOR_INTERVIEW = 'SELECTED_FOR_INTERVIEW', // Admin selected after initial review
  APPROVED = 'APPROVED', // Approved after interview, becomes TUTOR
  REJECTED = 'REJECTED',
}

export type ITutorApplication = {
  _id: Types.ObjectId;

  // Application Data
  subjects: Types.ObjectId[];
  name: string;
  email: string;
  phoneNumber: string;

  // Address (structured)
  street: string;
  houseNumber: string;
  zip: string;
  city: string;

  birthDate: Date;

  // Documents (all mandatory)
  cv: string;
  abiturCertificate: string;
  officialId: string;

  // Status Tracking (simple)
  status: APPLICATION_STATUS;
  rejectionReason?: string;
  revisionNote?: string; // Admin's note for what needs to be fixed

  // Interview cancellation (by admin)
  interviewCancelledReason?: string;
  interviewCancelledAt?: Date;

  // Admin Notes
  adminNotes?: string;

  // Timestamps
  submittedAt: Date;
  resubmittedAt?: Date;
  selectedForInterviewAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  revisionRequestedAt?: Date;
};

export type TutorApplicationModel = Model<ITutorApplication>;
