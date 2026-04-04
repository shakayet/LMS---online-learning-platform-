import { z } from 'zod';

const createApplicationZodSchema = z.object({
  body: z.object({

    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email format')
      .toLowerCase(),

    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters'),

    name: z
      .string({
        required_error: 'Name is required',
      })
      .trim()
      .min(2, 'Name must be at least 2 characters'),

    birthDate: z
      .string({
        required_error: 'Birth date is required',
      })
      .refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }),

    phoneNumber: z
      .string({
        required_error: 'Phone number is required',
      })
      .trim()
      .min(5, 'Phone number must be at least 5 characters'),

    street: z
      .string({
        required_error: 'Street is required',
      })
      .trim()
      .min(2, 'Street must be at least 2 characters'),

    houseNumber: z
      .string({
        required_error: 'House number is required',
      })
      .trim()
      .min(1, 'House number is required'),

    zip: z
      .string({
        required_error: 'ZIP code is required',
      })
      .trim()
      .min(4, 'ZIP code must be at least 4 characters'),

    city: z
      .string({
        required_error: 'City is required',
      })
      .trim()
      .min(2, 'City must be at least 2 characters'),

    subjects: z
      .array(z.string().trim().min(1, 'Subject cannot be empty'))
      .min(1, 'At least one subject is required'),

    cv: z
      .string({
        required_error: 'CV is required',
      })
      .url('CV must be a valid URL'),

    abiturCertificate: z
      .string({
        required_error: 'Abitur certificate is required',
      })
      .url('Abitur certificate must be a valid URL'),

    officialId: z
      .string({
        required_error: 'Official ID document is required',
      })
      .url('Official ID document must be a valid URL'),
  }),
});

const updateApplicationStatusZodSchema = z.object({
  body: z.object({
    status: z
      .enum([
        'SUBMITTED',
        'REVISION',
        'SELECTED_FOR_INTERVIEW',
        'APPROVED',
        'REJECTED',
      ])
      .optional(),
    rejectionReason: z.string().trim().optional(),
    revisionNote: z.string().trim().optional(),
    adminNotes: z.string().trim().optional(),
  }),
});

const selectForInterviewZodSchema = z.object({
  body: z.object({
    adminNotes: z.string().trim().optional(),
  }),
});

const approveApplicationZodSchema = z.object({
  body: z.object({
    adminNotes: z.string().trim().optional(),
  }),
});

const rejectApplicationZodSchema = z.object({
  body: z.object({
    rejectionReason: z
      .string({
        required_error: 'Rejection reason is required',
      })
      .trim()
      .min(10, 'Rejection reason must be at least 10 characters'),
  }),
});

const sendForRevisionZodSchema = z.object({
  body: z.object({
    revisionNote: z
      .string({
        required_error: 'Revision note is required',
      })
      .trim()
      .min(10, 'Revision note must be at least 10 characters'),
  }),
});

const updateMyApplicationZodSchema = z.object({
  body: z.object({
    cv: z.string().url('CV must be a valid URL').optional(),
    abiturCertificate: z
      .string()
      .url('Abitur certificate must be a valid URL')
      .optional(),
    officialId: z
      .string()
      .url('Official ID document must be a valid URL')
      .optional(),
  }),
});

export const TutorApplicationValidation = {
  createApplicationZodSchema,
  updateApplicationStatusZodSchema,
  selectForInterviewZodSchema,
  approveApplicationZodSchema,
  rejectApplicationZodSchema,
  sendForRevisionZodSchema,
  updateMyApplicationZodSchema,
};
