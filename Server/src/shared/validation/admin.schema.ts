import { z } from 'zod';

export const reviewOfficerRequestSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Status must be either "approved" or "rejected"' })
  }),
  reason: z.string().max(300).optional()
});

export const adminCreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'volunteer', 'municipal_officer'], {
    errorMap: () => ({ message: 'Role must be admin, volunteer, or municipal_officer' })
  }),
  isActive: z.boolean().optional().default(true)
});

export const officerRequestQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  page: z.string().transform((val) => Math.max(1, parseInt(val, 10) || 1)).optional(),
  limit: z.string().transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20))).optional()
});

export type ReviewOfficerRequestInput = z.infer<typeof reviewOfficerRequestSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type OfficerRequestQueryInput = z.infer<typeof officerRequestQuerySchema>;
