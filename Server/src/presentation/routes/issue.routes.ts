import { Router } from 'express';
import { IssueController } from '../controllers/issue.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  idParamSchema,
  issueQuerySchema,
  updateIssueStatusSchema
} from '../../shared/validation/issue.schema';

export const createIssueRouter = (issueController: IssueController): Router => {
  const router = Router();

  router.get(
    '/',
    validateRequest({ query: issueQuerySchema }),
    issueController.listIssues
  );

  router.get(
    '/:id',
    validateRequest({ params: idParamSchema }),
    issueController.getIssueById
  );

  router.patch(
    '/:id/status',
    authenticate,
    authorizeRoles('admin', 'municipal_officer'),
    validateRequest({
      params: idParamSchema,
      body: updateIssueStatusSchema
    }),
    issueController.updateStatus
  );

  return router;
};
