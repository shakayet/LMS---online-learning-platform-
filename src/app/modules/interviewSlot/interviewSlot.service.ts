import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { TutorApplication } from '../tutorApplication/tutorApplication.model';
import { APPLICATION_STATUS } from '../tutorApplication/tutorApplication.interface';
import {
  IInterviewSlot,
  INTERVIEW_SLOT_STATUS,
} from './interviewSlot.interface';
import { InterviewSlot } from './interviewSlot.model';
import {
  generateChannelName,
  generateRtcToken,
  userIdToAgoraUid,
} from '../call/agora.helper';
import config from '../../../config';

const createInterviewSlot = async (
  adminId: string,
  payload: Partial<IInterviewSlot>
): Promise<IInterviewSlot> => {

  const admin = await User.findById(adminId);
  if (!admin) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found');
  }

  const slotData = {
    ...payload,
    adminId: new Types.ObjectId(adminId),
    status: INTERVIEW_SLOT_STATUS.AVAILABLE,
  };

  const slot = await InterviewSlot.create(slotData);

  return slot;
};

const getAllInterviewSlots = async (
  query: Record<string, unknown>,
  userId?: string,
  userRole?: string
) => {
  let filter = {};

  if (userRole === 'APPLICANT') {

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    const application = await TutorApplication.findOne({ email: user.email });
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'No application found');
    }

    if (application.status !== APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You must be selected for interview to view available slots'
      );
    }

    filter = { status: INTERVIEW_SLOT_STATUS.AVAILABLE };
  }

  const slotQuery = new QueryBuilder(
    InterviewSlot.find(filter)
      .populate('adminId', 'name email')
      .populate('applicantId', 'name email'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await slotQuery.modelQuery;
  const meta = await slotQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

const getSingleInterviewSlot = async (id: string): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(id)
    .populate('adminId', 'name email')
    .populate('applicantId', 'name email')
    .populate('applicationId');

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  return slot;
};

const bookInterviewSlot = async (
  slotId: string,
  applicantId: string,
  applicationId: string
): Promise<IInterviewSlot | null> => {

  const slot = await InterviewSlot.findById(slotId);
  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  if (slot.status !== INTERVIEW_SLOT_STATUS.AVAILABLE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Interview slot is not available'
    );
  }

  const application = await TutorApplication.findById(applicationId);
  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  const user = await User.findById(applicantId);
  if (!user || application.email !== user.email) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'This application does not belong to you'
    );
  }

  if (application.status !== APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only applications selected for interview can book interview slots'
    );
  }

  const existingBooking = await InterviewSlot.findOne({
    applicantId: new Types.ObjectId(applicantId),
    status: INTERVIEW_SLOT_STATUS.BOOKED,
  });

  if (existingBooking) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have a booked interview slot. Cancel it first to book a new one.'
    );
  }

  slot.status = INTERVIEW_SLOT_STATUS.BOOKED;
  slot.applicantId = new Types.ObjectId(applicantId);
  slot.applicationId = new Types.ObjectId(applicationId);
  slot.bookedAt = new Date();

  slot.agoraChannelName = generateChannelName();

  await slot.save();

  await TutorApplication.findByIdAndUpdate(applicationId, {
    $unset: { interviewCancelledReason: 1, interviewCancelledAt: 1 },
  });

  return slot;
};

const cancelInterviewSlot = async (
  slotId: string,
  userId: string,
  cancellationReason: string
): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(slotId);

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  if (slot.status !== INTERVIEW_SLOT_STATUS.BOOKED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only booked slots can be cancelled'
    );
  }

  const user = await User.findById(userId);
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isSlotOwner = slot.applicantId?.toString() === userId;

  if (!isAdmin && !isSlotOwner) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to cancel this slot'
    );
  }

  if (!isAdmin) {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (slot.startTime <= oneHourFromNow) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot cancel interview less than 1 hour before the scheduled time'
      );
    }
  }

  const savedApplicationId = slot.applicationId;

  slot.status = INTERVIEW_SLOT_STATUS.AVAILABLE;
  slot.applicantId = undefined;
  slot.applicationId = undefined;
  slot.bookedAt = undefined;
  await slot.save();

  if (savedApplicationId) {
    const updateData: Record<string, unknown> = {
      status: APPLICATION_STATUS.SELECTED_FOR_INTERVIEW,
    };

    if (isAdmin && cancellationReason) {
      updateData.interviewCancelledReason = cancellationReason;
      updateData.interviewCancelledAt = new Date();
    }

    await TutorApplication.findByIdAndUpdate(savedApplicationId, updateData);
  }

  return slot;
};

const markAsCompleted = async (slotId: string): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(slotId);

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  if (slot.status !== INTERVIEW_SLOT_STATUS.BOOKED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only booked slots can be marked as completed'
    );
  }

  slot.status = INTERVIEW_SLOT_STATUS.COMPLETED;
  slot.completedAt = new Date();
  await slot.save();

  return slot;
};

const rescheduleInterviewSlot = async (
  currentSlotId: string,
  newSlotId: string,
  applicantId: string
): Promise<IInterviewSlot | null> => {

  const currentSlot = await InterviewSlot.findById(currentSlotId);
  if (!currentSlot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Current interview slot not found');
  }

  if (currentSlot.applicantId?.toString() !== applicantId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to reschedule this slot'
    );
  }

  if (currentSlot.status !== INTERVIEW_SLOT_STATUS.BOOKED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only booked slots can be rescheduled'
    );
  }

  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  if (currentSlot.startTime <= oneHourFromNow) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot reschedule interview less than 1 hour before the scheduled time'
    );
  }

  const newSlot = await InterviewSlot.findById(newSlotId);
  if (!newSlot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'New interview slot not found');
  }

  if (newSlot.status !== INTERVIEW_SLOT_STATUS.AVAILABLE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'New slot is not available'
    );
  }

  const savedApplicantId = currentSlot.applicantId;
  const savedApplicationId = currentSlot.applicationId;

  currentSlot.status = INTERVIEW_SLOT_STATUS.AVAILABLE;
  currentSlot.applicantId = undefined;
  currentSlot.applicationId = undefined;
  currentSlot.bookedAt = undefined;
  await currentSlot.save();

  newSlot.status = INTERVIEW_SLOT_STATUS.BOOKED;
  newSlot.applicantId = savedApplicantId;
  newSlot.applicationId = savedApplicationId;
  newSlot.bookedAt = new Date();
  await newSlot.save();

  return newSlot;
};

const updateInterviewSlot = async (
  id: string,
  payload: Partial<IInterviewSlot>
): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(id);

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  if (slot.status !== INTERVIEW_SLOT_STATUS.AVAILABLE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot update slot that is not available'
    );
  }

  const updated = await InterviewSlot.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return updated;
};

const deleteInterviewSlot = async (id: string): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(id);

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  if (slot.status === INTERVIEW_SLOT_STATUS.BOOKED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot delete booked slot. Cancel it first.'
    );
  }

  const result = await InterviewSlot.findByIdAndDelete(id);
  return result;
};

const getMyBookedInterview = async (
  applicantId: string
): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findOne({
    applicantId: new Types.ObjectId(applicantId),
    status: { $in: [INTERVIEW_SLOT_STATUS.BOOKED, INTERVIEW_SLOT_STATUS.COMPLETED] },
  })
    .populate('adminId', 'name email')
    .populate('applicationId')
    .sort({ createdAt: -1 });

  return slot;
};

const getScheduledMeetings = async (query: Record<string, unknown>) => {
  const slotQuery = new QueryBuilder(
    InterviewSlot.find({ status: INTERVIEW_SLOT_STATUS.BOOKED })
      .populate('adminId', 'name email')
      .populate('applicantId', 'name email')
      .populate({
        path: 'applicationId',
        select: 'name email phone subjects status',
        populate: {
          path: 'subjects',
          select: 'name',
        },
      }),
    query
  )
    .sort()
    .paginate();

  const result = await slotQuery.modelQuery;
  const meta = await slotQuery.getPaginationInfo();

  const meetings = result.map((slot: any) => {
    const application = slot.applicationId;

    const subjectNames = application?.subjects?.map((subject: any) =>
      typeof subject === 'object' ? subject.name : subject
    ) || [];

    return {
      _id: slot._id,
      applicantName: application?.name || slot.applicantId?.name || 'N/A',
      applicantEmail: application?.email || slot.applicantId?.email || 'N/A',
      applicantPhone: application?.phone || 'N/A',
      subjects: subjectNames,
      startTime: slot.startTime,
      endTime: slot.endTime,
      agoraChannelName: slot.agoraChannelName || null,
      bookedAt: slot.bookedAt,
      adminId: slot.adminId,
    };
  });

  return {
    meta,
    data: meetings,
  };
};

const getInterviewMeetingToken = async (
  slotId: string,
  userId: string
): Promise<{
  token: string;
  channelName: string;
  uid: number;
  appId: string;
}> => {
  const slot = await InterviewSlot.findById(slotId);

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  if (slot.status !== INTERVIEW_SLOT_STATUS.BOOKED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Interview slot is not booked'
    );
  }

  if (!slot.agoraChannelName) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No meeting channel available for this interview'
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const isAdmin = user.role === 'SUPER_ADMIN';
  const isApplicant = slot.applicantId?.toString() === userId;

  if (!isAdmin && !isApplicant) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to join this meeting'
    );
  }

  const uid = userIdToAgoraUid(userId);
  const token = generateRtcToken(slot.agoraChannelName, uid);

  return {
    token,
    channelName: slot.agoraChannelName,
    uid,
    appId: config.agora.appId!,
  };
};

const cleanupExpiredAvailableSlots = async (): Promise<number> => {

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const result = await InterviewSlot.deleteMany({
    status: INTERVIEW_SLOT_STATUS.AVAILABLE,
    startTime: { $lt: startOfToday },
  });

  return result.deletedCount;
};

export const InterviewSlotService = {
  createInterviewSlot,
  getAllInterviewSlots,
  getSingleInterviewSlot,
  bookInterviewSlot,
  cancelInterviewSlot,
  rescheduleInterviewSlot,
  markAsCompleted,
  updateInterviewSlot,
  deleteInterviewSlot,
  getMyBookedInterview,
  getScheduledMeetings,
  getInterviewMeetingToken,
  cleanupExpiredAvailableSlots,
};