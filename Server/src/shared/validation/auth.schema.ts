import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
});

export const volunteerRegisterSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email address')
      .transform((val) => val.toLowerCase().trim()),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export const officerRegisterSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email address')
      .transform((val) => val.toLowerCase().trim()),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
    municipality: z.string().min(2, 'Municipality is required').max(100).trim(),
    department: z.string().min(2, 'Department is required').max(100).trim(),
    employeeId: z.string().max(50).optional().transform((val) => val?.trim() || undefined)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type VolunteerRegisterInput = z.infer<typeof volunteerRegisterSchema>;
export type OfficerRegisterInput = z.infer<typeof officerRegisterSchema>;
