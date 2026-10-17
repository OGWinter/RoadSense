export interface ExtractedFrame {
  frameNumber: number;
  timestampMs: number;
  imagePath?: string;
}

export interface IVideoProcessor {
  isAvailable(): Promise<boolean>;
  extractFrames(videoPath: string, intervalSeconds?: number): Promise<ExtractedFrame[]>;
}
