import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { ILegalPolicy, POLICY_TYPE } from './legalPolicy.interface';
import { LegalPolicy } from './legalPolicy.model';

// Get all policies
const getAllPolicies = async (): Promise<ILegalPolicy[]> => {
  const result = await LegalPolicy.find().sort({ type: 1 }).lean();
  return result;
};

// Get policy by type
const getPolicyByType = async (type: POLICY_TYPE): Promise<ILegalPolicy | null> => {
  const result = await LegalPolicy.findOne({ type }).lean();
  return result;
};

// Get active policy by type (for public display)
const getActivePolicyByType = async (type: POLICY_TYPE): Promise<ILegalPolicy | null> => {
  const result = await LegalPolicy.findOne({ type, isActive: true }).lean();
  return result;
};

// Create or update policy
const upsertPolicy = async (
  type: POLICY_TYPE,
  payload: Partial<ILegalPolicy>,
  userId?: string
): Promise<ILegalPolicy> => {
  const existingPolicy = await LegalPolicy.findOne({ type });

  if (existingPolicy) {
    // Update existing policy
    const result = await LegalPolicy.findOneAndUpdate(
      { type },
      {
        ...payload,
        lastUpdatedBy: userId,
      },
      { new: true, runValidators: true }
    );

    if (!result) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update policy');
    }

    return result;
  } else {
    // Create new policy
    const result = await LegalPolicy.create({
      type,
      ...payload,
      lastUpdatedBy: userId,
    });

    return result;
  }
};

// Update policy
const updatePolicy = async (
  type: POLICY_TYPE,
  payload: Partial<ILegalPolicy>,
  userId?: string
): Promise<ILegalPolicy | null> => {
  const policy = await LegalPolicy.findOne({ type });

  if (!policy) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Policy not found');
  }

  const result = await LegalPolicy.findOneAndUpdate(
    { type },
    {
      ...payload,
      lastUpdatedBy: userId,
    },
    { new: true, runValidators: true }
  );

  return result;
};

// Delete policy (soft delete)
const deletePolicy = async (type: POLICY_TYPE): Promise<ILegalPolicy | null> => {
  const policy = await LegalPolicy.findOne({ type });

  if (!policy) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Policy not found');
  }

  const result = await LegalPolicy.findOneAndUpdate(
    { type },
    { isActive: false },
    { new: true }
  );

  return result;
};

// Get all active policies (for public display)
const getAllActivePolicies = async (): Promise<ILegalPolicy[]> => {
  const result = await LegalPolicy.find({ isActive: true }).sort({ type: 1 }).lean();
  return result;
};

// Initialize default policies if they don't exist
const initializeDefaultPolicies = async (): Promise<void> => {
  const defaultPolicies = [
    {
      type: POLICY_TYPE.PRIVACY_POLICY,
      title: 'Privacy Policy',
      content: '',
      isActive: true,
    },
    {
      type: POLICY_TYPE.TERMS_FOR_STUDENTS,
      title: 'Terms for Students',
      content: '',
      isActive: true,
    },
    {
      type: POLICY_TYPE.TERMS_FOR_TUTORS,
      title: 'Terms for Tutors',
      content: '',
      isActive: true,
    },
    {
      type: POLICY_TYPE.CANCELLATION_POLICY,
      title: 'Cancellation Policy',
      content: '',
      isActive: true,
    },
    {
      type: POLICY_TYPE.LEGAL_NOTICE,
      title: 'Legal Notice',
      content: '',
      isActive: true,
    },
    {
      type: POLICY_TYPE.COOKIE_POLICY,
      title: 'Cookie Policy',
      content: '',
      isActive: true,
    },
  ];

  for (const policy of defaultPolicies) {
    const exists = await LegalPolicy.findOne({ type: policy.type });
    if (!exists) {
      await LegalPolicy.create(policy);
    }
  }
};

export const LegalPolicyService = {
  getAllPolicies,
  getPolicyByType,
  getActivePolicyByType,
  upsertPolicy,
  updatePolicy,
  deletePolicy,
  getAllActivePolicies,
  initializeDefaultPolicies,
};
