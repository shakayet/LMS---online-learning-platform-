import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { ISchoolType } from './schoolType.interface';
import { SchoolType } from './schoolType.model';

const createSchoolType = async (payload: ISchoolType): Promise<ISchoolType> => {

  const existingSchoolType = await SchoolType.findOne({ name: payload.name });
  if (existingSchoolType) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'School type with this name already exists'
    );
  }

  const result = await SchoolType.create(payload);
  return result;
};

const getAllSchoolTypes = async (query: Record<string, unknown>) => {
  const schoolTypeQuery = new QueryBuilder(SchoolType.find(), query)
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await schoolTypeQuery.modelQuery;
  const pagination = await schoolTypeQuery.getPaginationInfo();

  return {
    data,
    pagination,
  };
};

const getSingleSchoolType = async (id: string): Promise<ISchoolType | null> => {
  const result = await SchoolType.findById(id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'School type not found');
  }

  return result;
};

const updateSchoolType = async (
  id: string,
  payload: Partial<ISchoolType>
): Promise<ISchoolType | null> => {

  const schoolType = await SchoolType.findById(id);
  if (!schoolType) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'School type not found');
  }

  if (payload.name && payload.name !== schoolType.name) {
    const existingSchoolType = await SchoolType.findOne({ name: payload.name });
    if (existingSchoolType) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'School type with this name already exists'
      );
    }
  }

  const result = await SchoolType.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteSchoolType = async (id: string): Promise<ISchoolType | null> => {
  const schoolType = await SchoolType.findById(id);
  if (!schoolType) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'School type not found');
  }

  const result = await SchoolType.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  return result;
};

const getActiveSchoolTypes = async (): Promise<ISchoolType[]> => {
  const result = await SchoolType.find({ isActive: true })
    .sort({ name: 1 })
    .lean();
  return result;
};

export const SchoolTypeService = {
  createSchoolType,
  getAllSchoolTypes,
  getSingleSchoolType,
  updateSchoolType,
  deleteSchoolType,
  getActiveSchoolTypes,
};
