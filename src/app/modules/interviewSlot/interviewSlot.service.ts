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

/**
 * Create interview slot (Admin only)
 */
const createInterviewSlot = async (
  adminId: string,
  payload: Partial<IInterviewSlot>
): Promise<IInterviewSlot> => {
  // Verify admin exists
  const admin = await User.findById(adminId);
  if (!admin) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found');
  }

  // Create slot
  const slotData = {
    ...payload,
    adminId: new Types.ObjectId(adminId),
    status: INTERVIEW_SLOT_STATUS.AVAILABLE,
  };

  const slot = await InterviewSlot.create(slotData);

  return slot;
};

/**
 * Get all interview slots with filtering
 * Admin: See all slots
 * Applicant: Must be SELECTED_FOR_INTERVIEW to see available slots
 */
const getAllInterviewSlots = async (
  query: Record<string, unknown>,
  userId?: string,
  userRole?: string
) => {
  let filter = {};

  // If applicant, check if they are SELECTED_FOR_INTERVIEW
  if (userRole === 'APPLICANT') {
    // Get user's email
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    // Check application status
    const application = await TutorApplication.findOne({ email: user.email });
    if (!application) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'No application found');
    }

    // Only SELECTED_FOR_INTERVIEW can view slots
    if (application.status !== APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You must be selected for interview to view available slots'
      );
    }

    // Only show available slots
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

/**
 * Get single interview slot by ID
 */
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

/**
 * Book interview slot (Applicant)
 */
const bookInterviewSlot = async (
  slotId: string,
  applicantId: string,
  applicationId: string
): Promise<IInterviewSlot | null> => {
  // Verify slot exists and is available
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

  // Verify application exists and belongs to applicant
  const application = await TutorApplication.findById(applicationId);
  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Application not found');
  }

  // Get user to check email match
  const user = await User.findById(applicantId);
  if (!user || application.email !== user.email) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'This application does not belong to you'
    );
  }

  // Check if application is SELECTED_FOR_INTERVIEW status
  if (application.status !== APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only applications selected for interview can book interview slots'
    );
  }

  // Check if applicant already has a booked slot
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

  // Update slot
  slot.status = INTERVIEW_SLOT_STATUS.BOOKED;
  slot.applicantId = new Types.ObjectId(applicantId);
  slot.applicationId = new Types.ObjectId(applicationId);
  slot.bookedAt = new Date();

  // Generate Agora channel name for video call
  slot.agoraChannelName = generateChannelName();

  await slot.save();

  // Clear any previous cancellation reason from the application
  await TutorApplication.findByIdAndUpdate(applicationId, {
    $unset: { interviewCancelledReason: 1, interviewCancelledAt: 1 },
  });

  // TODO: Send email notification to applicant with meeting details
  // await sendEmail({
  //   to: application.email,
  //   subject: 'Interview Scheduled - Tutor Application',
  //   template: 'interview-scheduled',
  //   data: {
  //     name: application.name,
  //     meetLink: slot.googleMeetLink,
  //     startTime: slot.startTime,
  //     endTime: slot.endTime
  //   }
  // });

  return slot;
};

/**
 * Cancel interview slot
 * Admin or Applicant can cancel (must be at least 1 hour before interview)
 */
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

  // Verify user is either admin or applicant of this slot
  const user = await User.findById(userId);
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isSlotOwner = slot.applicantId?.toString() === userId;

  if (!isAdmin && !isSlotOwner) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to cancel this slot'
    );
  }

  // Check if cancellation is at least 1 hour before interview (for applicants only)
  if (!isAdmin) {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (slot.startTime <= oneHourFromNow) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot cancel interview less than 1 hour before the scheduled time'
      );
    }
  }

  // Save applicationId before clearing
  const savedApplicationId = slot.applicationId;

  // Update slot - make it available again for others to book
  slot.status = INTERVIEW_SLOT_STATUS.AVAILABLE;
  slot.applicantId = undefined;
  slot.applicationId = undefined;
  slot.bookedAt = undefined;
  await slot.save();

  // Keep application status as SELECTED_FOR_INTERVIEW (so they can book again)
  // The applicant should still be able to book a new interview slot
  // If admin cancelled, save the cancellation reason to the application
  if (savedApplicationId) {
    const updateData: Record<string, unknown> = {
      status: APPLICATION_STATUS.SELECTED_FOR_INTERVIEW,
    };

    // Only save cancellation reason if admin cancelled (with a reason)
    if (isAdmin && cancellationReason) {
      updateData.interviewCancelledReason = cancellationReason;
      updateData.interviewCancelledAt = new Date();
    }

    await TutorApplication.findByIdAndUpdate(savedApplicationId, updateData);
  }

  // TODO: Send cancellation email
  // await sendEmail({
  //   to: application.email,
  //   subject: 'Interview Cancelled',
  //   template: 'interview-cancelled',
  //   data: { reason: cancellationReason, startTime: slot.startTime }
  // });

  return slot;
};

/**
 * Mark interview as completed (Admin only)
 * After completion, admin can approve/reject the application separately
 */
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

  // Update slot
  slot.status = INTERVIEW_SLOT_STATUS.COMPLETED;
  slot.completedAt = new Date();
  await slot.save();

  // Application status remains SUBMITTED - admin will approve/reject separately

  return slot;
};

/**
 * Reschedule interview slot (Applicant)
 * Cancel current booking and book a new slot in one action
 */
const rescheduleInterviewSlot = async (
  currentSlotId: string,
  newSlotId: string,
  applicantId: string
): Promise<IInterviewSlot | null> => {
  // Get current slot
  const currentSlot = await InterviewSlot.findById(currentSlotId);
  if (!currentSlot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Current interview slot not found');
  }

  // Verify applicant owns this slot
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

  // Check if reschedule is at least 1 hour before current interview
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  if (currentSlot.startTime <= oneHourFromNow) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot reschedule interview less than 1 hour before the scheduled time'
    );
  }

  // Get new slot
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

  // Save applicant and application IDs before clearing
  const savedApplicantId = currentSlot.applicantId;
  const savedApplicationId = currentSlot.applicationId;

  // Cancel current slot (make it available again)
  currentSlot.status = INTERVIEW_SLOT_STATUS.AVAILABLE;
  currentSlot.applicantId = undefined;
  currentSlot.applicationId = undefined;
  currentSlot.bookedAt = undefined;
  await currentSlot.save();

  // Book new slot
  newSlot.status = INTERVIEW_SLOT_STATUS.BOOKED;
  newSlot.applicantId = savedApplicantId;
  newSlot.applicationId = savedApplicationId;
  newSlot.bookedAt = new Date();
  await newSlot.save();

  // TODO: Send reschedule email notification
  // await sendEmail({
  //   to: applicant.email,
  //   subject: 'Interview Rescheduled',
  //   template: 'interview-rescheduled',
  //   data: {
  //     oldTime: currentSlot.startTime,
  //     newTime: newSlot.startTime,
  //     meetLink: newSlot.googleMeetLink
  //   }
  // });

  return newSlot;
};

/**
 * Update interview slot (Admin only)
 */
const updateInterviewSlot = async (
  id: string,
  payload: Partial<IInterviewSlot>
): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(id);

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  // Don't allow updating booked/completed/cancelled slots
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

/**
 * Delete interview slot (Admin only)
 */
const deleteInterviewSlot = async (id: string): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findById(id);

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Interview slot not found');
  }

  // Don't allow deleting booked slots
  if (slot.status === INTERVIEW_SLOT_STATUS.BOOKED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot delete booked slot. Cancel it first.'
    );
  }

  const result = await InterviewSlot.findByIdAndDelete(id);
  return result;
};

/**
 * Get my booked interview slot (Applicant only)
 * Returns BOOKED or COMPLETED interview slots
 */
const getMyBookedInterview = async (
  applicantId: string
): Promise<IInterviewSlot | null> => {
  const slot = await InterviewSlot.findOne({
    applicantId: new Types.ObjectId(applicantId),
    status: { $in: [INTERVIEW_SLOT_STATUS.BOOKED, INTERVIEW_SLOT_STATUS.COMPLETED] },
  })
    .populate('adminId', 'name email')
    .populate('applicationId')
    .sort({ createdAt: -1 }); // Get the most recent one

  return slot;
};

/**
 * Get all scheduled meetings (BOOKED interview slots) - Admin only
 * Returns slots with full applicant and application details
 */
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

  // Transform data to include application details
  const meetings = result.map((slot: any) => {
    const application = slot.applicationId;
    // Extract subject names from populated subjects
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

/**
 * Get meeting token for interview video call
 * Both Admin and Applicant can get token if they are part of the meeting
 */
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

  // Verify user is either admin or applicant of this slot
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

  // Generate Agora token
  const uid = userIdToAgoraUid(userId);
  const token = generateRtcToken(slot.agoraChannelName, uid);

  return {
    token,
    channelName: slot.agoraChannelName,
    uid,
    appId: config.agora.appId!,
  };
};

/**
 * Cleanup expired available interview slots
 * Deletes all AVAILABLE slots where the day has passed (startTime < start of today)
 * Only deletes unbooked slots - booked/completed/cancelled slots are kept for records
 */
const cleanupExpiredAvailableSlots = async (): Promise<number> => {
  // Get start of today (midnight)
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