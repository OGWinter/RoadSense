import { z } from 'zod';

export const issueQuerySchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['detected', 'verified', 'rejected', 'repair_pending', 'repaired']).optional(),
  type: z.enum(['pothole', 'crack', 'other']).optional(),
  sourceUploadId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid upload ID format').optional(),
  page: z.union([z.string(), z.number()]).transform((val) => Math.max(1, typeof val === 'number' ? val : parseInt(val, 10) || 1)).optional(),
  limit: z.union([z.string(), z.number()]).transform((val) => Math.min(100, Math.max(1, typeof val === 'number' ? val : parseInt(val, 10) || 20))).optional(),
  sortBy: z.enum(['createdAt', 'priorityScore', 'severity', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export const updateIssueStatusSchema = z.object({
  status: z.enum(['detected', 'verified', 'rejected', 'repair_pending', 'repaired'], {
    errorMap: () => ({ message: 'Status must be one of: detected, verified, rejected, repair_pending, repaired' })
  }),
  reason: z.string().max(300).optional()
});

export const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format; must be a valid 24-character hexadecimal MongoDB ObjectId')
});

export type IssueQueryInput = z.infer<typeof issueQuerySchema>;
export type UpdateIssueStatusInput = z.infer<typeof updateIssueStatusSchema>;
