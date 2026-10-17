import { z } from 'zod';

export const issueStatusUpdateSchema = z.object({
  status: z.enum(['detected', 'verified', 'rejected', 'repair_pending', 'repaired']),
  notes: z.string().optional(),
});

export type IssueStatusUpdateFormData = z.infer<typeof issueStatusUpdateSchema>;
