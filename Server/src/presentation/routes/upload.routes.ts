import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { uploadLimiter } from '../middleware/rateLimit.middleware';
import { uploadVideoAndGps } from '../middleware/upload.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { uploadQuerySchema } from '../../shared/validation/upload.schema';
import { idParamSchema } from '../../shared/validation/issue.schema';

export const createUploadRouter = (uploadController: UploadController): Router => {
  const router = Router();

  // MVP Direct Ingestion Endpoint - Only active Admins and Volunteers
  router.post(
    '/',
    authenticate,
    authorizeRoles('admin', 'volunteer'),
    uploadLimiter,
    uploadVideoAndGps,
    uploadController.uploadFiles
  );

  router.get(
    '/',
    authenticate,
    validateRequest({ query: uploadQuerySchema }),
    uploadController.listUploads
  );

  // Future Object Storage direct-to-cloud extension endpoints
  router.post('/initiate', authenticate, uploadController.initiateSession);
  router.post('/:id/complete', authenticate, validateRequest({ params: idParamSchema }), uploadController.completeSession);
  router.post('/:id/cancel', authenticate, validateRequest({ params: idParamSchema }), uploadController.cancelSession);

  router.get(
    '/:id',
    authenticate,
    validateRequest({ params: idParamSchema }),
    uploadController.getUploadById
  );

  router.delete(
    '/:id',
    authenticate,
    authorizeRoles('admin', 'volunteer'),
    validateRequest({ params: idParamSchema }),
    uploadController.deleteUpload
  );

  return router;
};
