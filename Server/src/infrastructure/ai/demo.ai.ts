import { RawDetection, IDetectionProvider } from './ai.interface';
import { ExtractedFrame } from '../video/video.interface';
import { logger } from '../../shared/logger';

export class DemoDetectionProvider implements IDetectionProvider {
  public readonly name = 'DemoHeuristicRoadAnomalyDetector';
  public readonly isRealAI = false;

  async detectInFrames(frames: ExtractedFrame[]): Promise<RawDetection[]> {
    logger.info({ provider: this.name, frameCount: frames.length }, 'Running demo detection provider on extracted frames');

    const detections: RawDetection[] = [];

    // For demonstration, produce simulated detections with explicitly labelled isDemo flag
    frames.forEach((frame, idx) => {
      // Create detections on alternate frames to simulate road observations
      if (idx % 2 === 0) {
        detections.push({
          type: 'pothole',
          confidence: Math.round((0.75 + (idx % 3) * 0.08) * 100) / 100,
          boundingBox: {
            x: 120 + idx * 10,
            y: 340 + idx * 5,
            width: 140,
            height: 90
          },
          videoTimestampMs: frame.timestampMs,
          isDemo: true,
          metadata: {
            note: 'Heuristic demo anomaly detection; requires production YOLO/Faster-RCNN model verification.'
          }
        });
      } else if (idx === 3) {
        detections.push({
          type: 'crack',
          confidence: 0.84,
          boundingBox: {
            x: 200,
            y: 400,
            width: 210,
            height: 45
          },
          videoTimestampMs: frame.timestampMs,
          isDemo: true,
          metadata: {
            note: 'Heuristic demo longitudinal crack detection.'
          }
        });
      }
    });

    logger.info({ detectionCount: detections.length }, 'Demo detections completed');
    return detections;
  }
}
