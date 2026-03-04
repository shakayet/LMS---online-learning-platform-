"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorApplicationValidation = void 0;
const zod_1 = require("zod");
// Create application validation (PUBLIC - creates user + application)
const createApplicationZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Auth fields (new user creation)
        email: zod_1.z
            .string({
            required_error: 'Email is required',
        })
            .email('Invalid email format')
            .toLowerCase(),
        password: zod_1.z
            .string({
            required_error: 'Password is required',
        })
            .min(8, 'Password must be at least 8 characters'),
        // Personal info
        name: zod_1.z
            .string({
            required_error: 'Name is required',
        })
            .trim()
            .min(2, 'Name must be at least 2 characters'),
        birthDate: zod_1.z
            .string({
            required_error: 'Birth date is required',
        })
            .refine((date) => !isNaN(Date.parse(date)), {
            message: 'Invalid date format',
        }),
        phoneNumber: zod_1.z
            .string({
            required_error: 'Phone number is required',
        })
            .trim()
            .min(5, 'Phone number must be at least 5 characters'),
        // Address (structured)
        street: zod_1.z
            .string({
            required_error: 'Street is required',
        })
            .trim()
            .min(2, 'Street must be at least 2 characters'),
        houseNumber: zod_1.z
            .string({
            required_error: 'House number is required',
        })
            .trim()
            .min(1, 'House number is required'),
        zip: zod_1.z
            .string({
            required_error: 'ZIP code is required',
        })
            .trim()
            .min(4, 'ZIP code must be at least 4 characters'),
        city: zod_1.z
            .string({
            required_error: 'City is required',
        })
            .trim()
            .min(2, 'City must be at least 2 characters'),
        // Subjects (multiple selection)
        subjects: zod_1.z
            .array(zod_1.z.string().trim().min(1, 'Subject cannot be empty'))
            .min(1, 'At least one subject is required'),
        // Documents (all mandatory)
        cv: zod_1.z
            .string({
            required_error: 'CV is required',
        })
            .url('CV must be a valid URL'),
        abiturCertificate: zod_1.z
            .string({
            required_error: 'Abitur certificate is required',
        })
            .url('Abitur certificate must be a valid URL'),
        officialId: zod_1.z
            .string({
            required_error: 'Official ID document is required',
        })
            .url('Official ID document must be a valid URL'),
    }),
});
// Update application status (admin only) - simplified
const updateApplicationStatusZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z
            .enum([
            'SUBMITTED',
            'REVISION',
            'SELECTED_FOR_INTERVIEW',
            'APPROVED',
            'REJECTED',
        ])
            .optional(),
        rejectionReason: zod_1.z.string().trim().optional(),
        revisionNote: zod_1.z.string().trim().optional(),
        adminNotes: zod_1.z.string().trim().optional(),
    }),
});
// Select for interview (admin only)
const selectForInterviewZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        adminNotes: zod_1.z.string().trim().optional(),
    }),
});
// Approve application (admin only)
const approveApplicationZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        adminNotes: zod_1.z.string().trim().optional(),
    }),
});
// Reject application (admin only)
const rejectApplicationZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        rejectionReason: zod_1.z
            .string({
            required_error: 'Rejection reason is required',
        })
            .trim()
            .min(10, 'Rejection reason must be at least 10 characters'),
    }),
});
// Send for revision (admin only)
const sendForRevisionZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        revisionNote: zod_1.z
            .string({
            required_error: 'Revision note is required',
        })
            .trim()
            .min(10, 'Revision note must be at least 10 characters'),
    }),
});
// Update my application (applicant only - when in REVISION status)
const updateMyApplicationZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        cv: zod_1.z.string().url('CV must be a valid URL').optional(),
        abiturCertificate: zod_1.z
            .string()
            .url('Abitur certificate must be a valid URL')
            .optional(),
        officialId: zod_1.z
            .string()
            .url('Official ID document must be a valid URL')
            .optional(),
    }),
});
exports.TutorApplicationValidation = {
    createApplicationZodSchema,
    updateApplicationStatusZodSchema,
    selectForInterviewZodSchema,
    approveApplicationZodSchema,
    rejectApplicationZodSchema,
    sendForRevisionZodSchema,
    updateMyApplicationZodSchema,
};
