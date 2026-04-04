import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { ISubject } from './subject.interface';
import { Subject } from './subject.model';
import { TrialRequest } from '../trialRequest/trialRequest.model';
import { SessionRequest } from '../sessionRequest/sessionRequest.model';
import { User } from '../user/user.model';
import { TutorApplication } from '../tutorApplication/tutorApplication.model';

const createSubject = async (payload: ISubject): Promise<ISubject> => {

  const existingSubject = await Subject.findOne({ name: payload.name });
  if (existingSubject) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Subject with this same name already exists'
    );
  }

  const result = await Subject.create(payload);
  return result;
};

const getAllSubjects = async (query: Record<string, unknown>) => {
  const subjectQuery = new QueryBuilder(Subject.find(), query)
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await subjectQuery.modelQuery;
  const pagination = await subjectQuery.getPaginationInfo();

  return {
    data,
    pagination,
  };
};

const getSingleSubject = async (id: string): Promise<ISubject | null> => {
  const result = await Subject.findById(id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

  return result;
};

const updateSubject = async (
  id: string,
  payload: Partial<ISubject>
): Promise<ISubject | null> => {

  const subject = await Subject.findById(id);
  if (!subject) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

  if (payload.name && payload.name !== subject.name) {
    const existingSubject = await Subject.findOne({ name: payload.name });
    if (existingSubject) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Subject with this name already exists'
      );
    }
  }

  const result = await Subject.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteSubject = async (id: string): Promise<ISubject | null> => {
  const subject = await Subject.findById(id);
  if (!subject) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

  const activeTrialRequests = await TrialRequest.countDocuments({
    subject: id,
    status: { $in: ['PENDING', 'ACCEPTED'] },
  });
  if (activeTrialRequests > 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot delete: ${activeTrialRequests} active trial request(s) use this subject. Deactivate it instead.`
    );
  }

  const activeSessionRequests = await SessionRequest.countDocuments({
    subject: id,
    status: { $in: ['PENDING', 'ACCEPTED'] },
  });
  if (activeSessionRequests > 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot delete: ${activeSessionRequests} active session request(s) use this subject. Deactivate it instead.`
    );
  }

  await User.updateMany(
    { subjects: id },
    { $pull: { subjects: id } }
  );

  await TutorApplication.updateMany(
    { subjects: id },
    { $pull: { subjects: id } }
  );

  const result = await Subject.findByIdAndDelete(id);
  return result;
};

const getActiveSubjects = async (): Promise<ISubject[]> => {
  const result = await Subject.find({ isActive: true })
    .sort({ name: 1 })
    .lean();
  return result;
};

export const SubjectService = {
  createSubject,
  getAllSubjects,
  getSingleSubject,
  updateSubject,
  deleteSubject,
  getActiveSubjects,
};
