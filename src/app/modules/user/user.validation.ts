import { z } from 'zod';
import { USER_ROLES } from '../../../enums/user';

const phoneRegex = /^\+?[0-9]{7,15}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|;:'",.<>/?]).{8,}$/;

const createUserZodSchema = z.object({
  body: z
    .object({
      name: z.string({ required_error: 'Name is required' }).min(1),
      email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email address'),
      gender: z.enum(['male', 'female']).optional(),
      dateOfBirth: z.string().optional(),
      location: z.string().optional(),
      phone: z
        .string()
        .regex(phoneRegex, 'Phone must be 7-15 digits, optional +')
        .optional(),
      role: z.enum([USER_ROLES.STUDENT, USER_ROLES.TUTOR]).optional(),
      password: z
        .string({ required_error: 'Password is required' })
        .regex(passwordRegex, 'Password must include upper, lower, number, special and be 8+ chars'),
      profilePicture: z.string().optional(),
    })
    .strict(),
});

// const updateUserZodSchema = z.object({
//   name: z.string().optional(),
//   email: z.string().optional(),
//   gender: z.enum(['male', 'female']).optional(),
//   dateOfBirth: z.string().optional(),
//   location: z.string().optional(),
//   phone: z.string().optional(),
//   password: z.string().optional(),
//   image: z.string().optional(),
// });
const updateUserZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    gender: z.enum(['male', 'female']).optional(),
    dateOfBirth: z.string().optional(),
    location: z.string().optional(),
    phone: z.string().regex(phoneRegex, 'Phone must be 7-15 digits, optional +').optional(),
    password: z
      .string()
      .regex(passwordRegex, 'Password must include upper, lower, number, special and be 8+ chars')
      .optional(),
    profilePicture: z.string().optional(),
  }),
});

// Admin: Update tutor subjects
const updateTutorSubjectsZodSchema = z.object({
  body: z.object({
    subjects: z
      .array(z.string().min(1, 'Subject cannot be empty'))
      .min(1, 'At least one subject is required'),
  }),
});

// Admin: Update tutor profile (without password)
const adminUpdateTutorProfileZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name cannot be empty').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().regex(phoneRegex, 'Phone must be 7-15 digits, optional +').optional().or(z.literal('')),
    dateOfBirth: z.string().optional(),
    location: z.string().optional(),
    // Tutor profile fields
    tutorProfile: z.object({
      address: z.string().optional(),
      birthDate: z.string().optional(),
      bio: z.string().optional(),
      languages: z.array(z.string()).optional(),
      teachingExperience: z.string().optional(),
      education: z.string().optional(),
      subjects: z.array(z.string()).optional(),
    }).optional(),
  }),
});

// Admin: Update student profile (without password)
const adminUpdateStudentProfileZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name cannot be empty').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().regex(phoneRegex, 'Phone must be 7-15 digits, optional +').optional().or(z.literal('')),
    dateOfBirth: z.string().optional(),
    location: z.string().optional(),
  }),
});

export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
  updateTutorSubjectsZodSchema,
  adminUpdateTutorProfileZodSchema,
  adminUpdateStudentProfileZodSchema,
};
