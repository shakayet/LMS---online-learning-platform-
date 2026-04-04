import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import {
  APPLICATION_STATUS,
  ITutorApplication,
} from './tutorApplication.interface';
import { TutorApplication } from './tutorApplication.model';
import { jwtHelper } from '../../../helpers/jwtHelper';
import config from '../../../config';
import { ActivityLogService } from '../activityLog/activityLog.service';

type TApplicationPayload = {
  email: string;
  password: string;
  name: string;
  birthDate: string;
  phoneNumber: string;
  street: string;
  houseNumber: string;
  zip: string;
  city: string;
  subjects: string[];
  cv: string;
  abiturCertificate: string;
  officialId: string;
};

const submitApplication = async (payload: TApplicationPayload) => {

  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new ApiError(StatusCodes.CONFLICT, 'Email already registered');
  }

  const existingApplication = await TutorApplication.findOne({
    email: payload.email,
  });
  if (existingApplication) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'An application with this email already exists'
    );
  }

  const newUser = await User.create({
    name: payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phoneNumber,
    role: USER_ROLES.APPLICANT,
    dateOfBirth: new Date(payload.birthDate),
    tutorProfile: {
      subjects: payload.subjects,
      cvUrl: payload.cv,
      abiturCertificateUrl: payload.abiturCertificate,
    },
  });

  const accessToken = jwtHelper.createToken(
    { id: newUser._id, role: newUser.role, email: newUser.email },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  const application = await TutorApplication.create({
    name: payload.name,
    email: payload.email,
    phoneNumber: payload.phoneNumber,
    birthDate: new Date(payload.birthDate),
    street: payload.street,
    houseNumber: payload.houseNumber,
    zip: payload.zip,
    city: payload.city,
    subjects: payload.subjects,
    cv: payload.cv,
    abiturCertificate: payload.abiturCertificate,
    officialId: payload.officialId,
    status: APPLICATION_STATUS.SUBMITTED,
    submittedAt: new Date(),
  });

  ActivityLogService.logActivity({
    userId: newUser._id,
    actionType: 'APPLICATION_SUBMITTED',
    title: 'New Tutor Application',
    description: `${payload.name} submitted a tutor application`,
    entityType: 'APPLICATION',
    entityId: application._id,
    status: 'success',
  });

  return {
    application,
    user: {
      _id: newUser._id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
    accessToken,
  };
};

const getMyApplication = async (
  userEmail: string,
  currentUserRole: string
) => {
  const application = await TutorApplication.findOne({
    email: userEmail,
  }).populate({ path: 'subjects', select: 'name -_id' });

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No application found');
  }

  let newAccessToken = null;
  if (
    application.status === APPLICATION_STATUS.APPROVED &&
    currentUserRole === USER_ROLES.APPLICANT
  ) {
    const user = await User.findOne({ email: userEmail });
    if (user && user.role === USER_ROLES.TUTOR) {
      newAccessToken = jwtHelper.createToken(
        { id: user._id, role: user.role, email: user.email },
        config.jwt.jwt_secret as Secret,
        config.jwt.jwt_expire_in as string
      );
    }
  }

  return { application, newAccessToken };
};

const getAllApplications = async (query: Record<string, unknown>) => {
  const applicationQuery = new QueryBuilder(TutorApplication.find(), query)
    .search(['name', 'email', 'phoneNumber', 'city'])
    .filter()
    .sort()
    .paginate()
    .fields();

  applicationQuery.modelQuery = applicationQuery.modelQuery.populate({
    path: 'subjects',
    select: 'name -_id',
  });

  const result = await applicationQuery.modelQuery;
  const meta = await applicationQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

const getSingleApplication = async (
  id: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id).populate({
    path: 'subjects',
    select: 'name -_id',
  });

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  return application;
};

const selectForInterview = async (
  id: string,
  adminNotes?: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.status === APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Application is already selected for interview'
    );
  }

  if (application.status === APPLICATION_STATUS.APPROVED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Application is already approved'
    );
  }

  if (application.status === APPLICATION_STATUS.REJECTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot select a rejected application for interview'
    );
  }

  if (
    application.status !== APPLICATION_STATUS.SUBMITTED &&
    application.status !== APPLICATION_STATUS.REVISION &&
    application.status !== APPLICATION_STATUS.RESUBMITTED
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only submitted, revision, or resubmitted applications can be selected for interview'
    );
  }

  application.status = APPLICATION_STATUS.SELECTED_FOR_INTERVIEW;
  application.selectedForInterviewAt = new Date();
  if (adminNotes) {
    application.adminNotes = adminNotes;
  }
  await application.save();

  return application;
};

const approveApplication = async (
  id: string,
  adminNotes?: string
): Promise<{ application: ITutorApplication; newAccessToken: string | null }> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.status === APPLICATION_STATUS.APPROVED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Application is already approved'
    );
  }

  if (application.status === APPLICATION_STATUS.REJECTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot approve a rejected application'
    );
  }

  if (application.status !== APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Application must be selected for interview before approval. Please select for interview first.'
    );
  }

  application.status = APPLICATION_STATUS.APPROVED;
  application.approvedAt = new Date();
  if (adminNotes) {
    application.adminNotes = adminNotes;
  }
  await application.save();

  const fullAddress = `${application.street} ${application.houseNumber}, ${application.zip} ${application.city}`;

  const updatedUser = await User.findOneAndUpdate(
    { email: application.email },
    {
      role: USER_ROLES.TUTOR,
      'tutorProfile.isVerified': true,
      'tutorProfile.verificationStatus': 'APPROVED',
      'tutorProfile.subjects': application.subjects,
      'tutorProfile.address': fullAddress,
      'tutorProfile.birthDate': application.birthDate,
      'tutorProfile.cvUrl': application.cv,
      'tutorProfile.abiturCertificateUrl': application.abiturCertificate,
    },
    { new: true }
  );

  if (updatedUser) {
    ActivityLogService.logActivity({
      userId: updatedUser._id,
      actionType: 'TUTOR_VERIFIED',
      title: 'Tutor Verified',
      description: `${application.name} has been verified as a tutor`,
      entityType: 'APPLICATION',
      entityId: application._id,
      status: 'success',
    });
  }

  let newAccessToken = null;
  if (updatedUser) {
    newAccessToken = jwtHelper.createToken(
      { id: updatedUser._id, role: updatedUser.role, email: updatedUser.email },
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string
    );
  }

  return { application, newAccessToken };
};

const rejectApplication = async (
  id: string,
  rejectionReason: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.status === APPLICATION_STATUS.APPROVED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot reject an approved application'
    );
  }

  application.status = APPLICATION_STATUS.REJECTED;
  application.rejectionReason = rejectionReason;
  application.rejectedAt = new Date();
  await application.save();

  const user = await User.findOne({ email: application.email });
  if (user) {
    ActivityLogService.logActivity({
      userId: user._id,
      actionType: 'APPLICATION_REJECTED',
      title: 'Application Rejected',
      description: `${application.name}'s tutor application was rejected`,
      entityType: 'APPLICATION',
      entityId: application._id,
      status: 'warning',
    });
  }

  return application;
};

const sendForRevision = async (
  id: string,
  revisionNote: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.status === APPLICATION_STATUS.APPROVED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot request revision for an approved application'
    );
  }

  if (application.status === APPLICATION_STATUS.REJECTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot request revision for a rejected application'
    );
  }

  application.status = APPLICATION_STATUS.REVISION;
  application.revisionNote = revisionNote;
  application.revisionRequestedAt = new Date();
  await application.save();

  return application;
};

const deleteApplication = async (
  id: string
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findById(id);

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  const result = await TutorApplication.findByIdAndDelete(id);
  return result;
};

type TUpdateApplicationPayload = {
  cv?: string;
  abiturCertificate?: string;
  officialId?: string;
};

const updateMyApplication = async (
  userEmail: string,
  payload: TUpdateApplicationPayload
): Promise<ITutorApplication | null> => {
  const application = await TutorApplication.findOne({ email: userEmail });

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  if (application.status !== APPLICATION_STATUS.REVISION) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You can only update your application when revision is requested'
    );
  }

  if (payload.cv) {
    application.cv = payload.cv;
  }
  if (payload.abiturCertificate) {
    application.abiturCertificate = payload.abiturCertificate;
  }
  if (payload.officialId) {
    application.officialId = payload.officialId;
  }

  application.status = APPLICATION_STATUS.RESUBMITTED;
  application.resubmittedAt = new Date();

  await User.findOneAndUpdate(
    { email: userEmail },
    {
      'tutorProfile.cvUrl': application.cv,
      'tutorProfile.abiturCertificateUrl': application.abiturCertificate,
    }
  );

  await application.save();

  const user = await User.findOne({ email: userEmail });
  if (user) {
    ActivityLogService.logActivity({
      userId: user._id,
      actionType: 'APPLICATION_RESUBMITTED',
      title: 'Application Resubmitted',
      description: `${application.name} resubmitted their tutor application after revision`,
      entityType: 'APPLICATION',
      entityId: application._id,
      status: 'success',
    });
  }

  return application.populate({ path: 'subjects', select: 'name -_id' });
};

export const TutorApplicationService = {
  submitApplication,
  getMyApplication,
  getAllApplications,
  getSingleApplication,
  selectForInterview,
  approveApplication,
  rejectApplication,
  sendForRevision,
  deleteApplication,
  updateMyApplication,
};
