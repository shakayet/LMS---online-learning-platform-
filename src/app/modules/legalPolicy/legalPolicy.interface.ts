import { Model } from 'mongoose';

// Policy types enum
export enum POLICY_TYPE {
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  TERMS_FOR_STUDENTS = 'TERMS_FOR_STUDENTS',
  TERMS_FOR_TUTORS = 'TERMS_FOR_TUTORS',
  CANCELLATION_POLICY = 'CANCELLATION_POLICY',
  LEGAL_NOTICE = 'LEGAL_NOTICE',
  COOKIE_POLICY = 'COOKIE_POLICY',
}

export type ILegalPolicy = {
  type: POLICY_TYPE;
  title: string;
  content: string;
  isActive: boolean;
  lastUpdatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type LegalPolicyModel = Model<ILegalPolicy>;