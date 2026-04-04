"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrialRequestValidation = void 0;
const zod_1 = require("zod");

const guardianInfoSchema = zod_1.z.object({
    name: zod_1.z
        .string({
        required_error: 'Guardian name is required',
    })
        .trim()
        .min(2, 'Guardian name must be at least 2 characters')
        .max(100, 'Guardian name cannot exceed 100 characters'),
    email: zod_1.z
        .string({
        required_error: 'Guardian email is required',
    })
        .trim()
        .email('Invalid guardian email format'),
    password: zod_1.z
        .string({
        required_error: 'Guardian password is required',
    })
        .min(6, 'Guardian password must be at least 6 characters'),
    phone: zod_1.z
        .string({
        required_error: 'Guardian phone number is required',
    })
        .trim()
        .min(8, 'Phone number must be at least 8 characters')
        .max(20, 'Phone number cannot exceed 20 characters'),
});

const studentInfoSchema = zod_1.z
    .object({
    name: zod_1.z
        .string({
        required_error: 'Name is required',
    })
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name cannot exceed 100 characters'),

    email: zod_1.z.string().trim().email('Invalid email format').optional(),

    password: zod_1.z
        .string()
        .min(6, 'Password must be at least 6 characters')
        .optional(),
    isUnder18: zod_1.z.boolean({
        required_error: 'Please specify if student is under 18',
    }),
    dateOfBirth: zod_1.z
        .string()
        .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid date of birth format',
    })
        .optional(),

    guardianInfo: guardianInfoSchema.optional(),
})
    .refine(data => {

    if (data.isUnder18 && !data.guardianInfo) {
        return false;
    }
    return true;
}, {
    message: 'Guardian information is required for students under 18',
    path: ['guardianInfo'],
})
    .refine(data => {

    if (!data.isUnder18 && !data.email) {
        return false;
    }
    return true;
}, {
    message: 'Email is required for students 18 and above',
    path: ['email'],
})
    .refine(data => {

    if (!data.isUnder18 && !data.password) {
        return false;
    }
    return true;
}, {
    message: 'Password is required for students 18 and above',
    path: ['password'],
});

const createTrialRequestZodSchema = zod_1.z.object({
    body: zod_1.z.object({

        studentInfo: studentInfoSchema,

        subject: zod_1.z
            .string({
            required_error: 'Subject is required',
        })
            .trim()
            .min(1, 'Subject is required'),
        gradeLevel: zod_1.z
            .string({
            required_error: 'Grade level is required',
        })
            .trim()
            .min(1, 'Grade level is required'),
        schoolType: zod_1.z
            .string({
            required_error: 'School type is required',
        })
            .trim()
            .min(1, 'School type is required'),

        description: zod_1.z
            .string({
            required_error: 'Description is required',
        })
            .trim()
            .min(10, 'Description must be at least 10 characters')
            .max(500, 'Description cannot exceed 500 characters'),
        learningGoals: zod_1.z
            .string()
            .trim()
            .max(1000, 'Learning goals cannot exceed 1000 characters')
            .optional(),
        preferredLanguage: zod_1.z.enum(['ENGLISH', 'GERMAN'], {
            required_error: 'Preferred language is required',
        }),
        preferredDateTime: zod_1.z
            .string()
            .refine(date => !isNaN(Date.parse(date)), {
            message: 'Invalid preferred date/time format',
        })
            .optional(),

        documents: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    }),
});

const cancelTrialRequestZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        cancellationReason: zod_1.z
            .string({
            required_error: 'Cancellation reason is required',
        })
            .trim()
            .min(10, 'Cancellation reason must be at least 10 characters'),
    }),
});

const acceptTrialRequestZodSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string({
            required_error: 'Trial request ID is required',
        })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid trial request ID format'),
    }),
    body: zod_1.z.object({
        introductoryMessage: zod_1.z
            .string()
            .trim()
            .transform(val => val === '' ? undefined : val)
            .optional()
            .refine(val => val === undefined || (val.length >= 10 && val.length <= 500), {
            message: 'Introductory message must be between 10 and 500 characters',
        }),
    }),
});
exports.TrialRequestValidation = {
    createTrialRequestZodSchema,
    cancelTrialRequestZodSchema,
    acceptTrialRequestZodSchema,
    guardianInfoSchema,
    studentInfoSchema,
};
