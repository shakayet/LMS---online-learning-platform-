import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { IGrade } from './grade.interface';
import { Grade } from './grade.model';

const createGrade = async (payload: IGrade): Promise<IGrade> => {
  // Check if grade with the same name already exists
  const existingGrade = await Grade.findOne({ name: payload.name });
  if (existingGrade) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Grade with this name already exists'
    );
  }

  const result = await Grade.create(payload);
  return result;
};

// Get all grades with filtering, searching, pagination
const getAllGrades = async (query: Record<string, unknown>) => {
  const gradeQuery = new QueryBuilder(Grade.find(), query)
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await gradeQuery.modelQuery;
  const pagination = await gradeQuery.getPaginationInfo();

  return {
    data,
    pagination,
  };
};

// Get single grade by ID
const getSingleGrade = async (id: string): Promise<IGrade | null> => {
  const result = await Grade.findById(id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Grade not found');
  }

  return result;
};

// Update grade
const updateGrade = async (
  id: string,
  payload: Partial<IGrade>
): Promise<IGrade | null> => {
  // Check if grade exists
  const grade = await Grade.findById(id);
  if (!grade) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Grade not found');
  }

  // If updating name, check for uniqueness
  if (payload.name && payload.name !== grade.name) {
    const existingGrade = await Grade.findOne({ name: payload.name });
    if (existingGrade) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Grade with this name already exists'
      );
    }
  }

  const result = await Grade.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

// Delete grade (soft delete by setting isActive to false)
const deleteGrade = async (id: string): Promise<IGrade | null> => {
  const grade = await Grade.findById(id);
  if (!grade) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Grade not found');
  }

  // Soft delete
  const result = await Grade.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  return result;
};

const getActiveGrades = async (): Promise<IGrade[]> => {
  const result = await Grade.find({ isActive: true })
    .sort({ name: 1 })
    .lean();
  return result;
};

export const GradeService = {
  createGrade,
  getAllGrades,
  getSingleGrade,
  updateGrade,
  deleteGrade,
  getActiveGrades,
};
