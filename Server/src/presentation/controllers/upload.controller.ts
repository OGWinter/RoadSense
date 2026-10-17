import { Response, NextFunction } from 'express';
import { UploadService } from '../../services/upload.service';
import { AuthenticatedRequest } from '../../shared/types';
import { BadRequestError } from '../../shared/errors/app.error';

export class UploadController {
  constructor(private uploadService: UploadService) {}

  uploadFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const videoFile = files?.['video']?.[0];
      const gpsFile = files?.['gpsFile']?.[0];

      if (!videoFile) {
        throw new BadRequestError('Video file is required (form-data key: "video")');
      }

      const upload = await this.uploadService.handleUpload(
        req.user!,
        videoFile,
        gpsFile,
        {
          recordingStartedAt: req.body.recordingStartedAt,
          recordingEndedAt: req.body.recordingEndedAt,
          gpsSamples: req.body.gpsSamples || req.body.gpsData
        }
      );

      res.status(202).json({
        success: true,
        message: 'Video upload received and processing started',
        data: upload
      });
    } catch (error) {
      next(error);
    }
  };

  listUploads = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const mineOnly = req.query.mine === 'true' || req.query.mine === '1';

      const result = await this.uploadService.listUploads(req.user!, page, limit, mineOnly);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getUploadById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const upload = await this.uploadService.getUploadById(req.user!, req.params.id);

      res.status(200).json({
        success: true,
        data: upload
      });
    } catch (error) {
      next(error);
    }
  };

  deleteUpload = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.uploadService.deleteUpload(req.user!, req.params.id);

      res.status(200).json({
        success: true,
        message: 'Upload video and associated assets permanently deleted'
      });
    } catch (error) {
      next(error);
    }
  };

  // Direct-to-storage future extension stubs
  initiateSession = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: 'Direct-to-cloud upload initiation session stub',
      data: {
        uploadSessionId: 'sess_' + Date.now(),
        presignedUrl: 'https://storage.googleapis.com/roadsense-bucket/demo-key',
        expiresInSeconds: 900
      }
    });
  };

  completeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: `Upload session ${req.params.id} marked complete and enqueued for verification`
    });
  };

  cancelSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: `Upload session ${req.params.id} cancelled`
    });
  };
}
