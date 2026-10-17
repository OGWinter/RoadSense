import { IssueType } from '../../shared/types';
import { ExtractedFrame } from '../video/video.interface';

export interface RawDetection {
  type: IssueType;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  videoTimestampMs: number;
  isDemo: boolean;
  metadata?: Record<string, unknown>;
}

export interface IDetectionProvider {
  name: string;
  isRealAI: boolean;
  detectInFrames(frames: ExtractedFrame[]): Promise<RawDetection[]>;
}
