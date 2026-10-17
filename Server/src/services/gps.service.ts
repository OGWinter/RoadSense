import fs from 'fs';
import { logger } from '../shared/logger';

export interface GpsPoint {
  lat: number;
  lng: number;
  timestampMs: number;
  accuracy?: number;
}

export interface GpsParseResult {
  points: GpsPoint[];
  format: 'csv' | 'gpx' | 'json' | 'none';
  status: 'available' | 'missing' | 'error' | 'unaligned';
  sampleCount: number;
  error?: string;
}

export class GpsService {
  /**
   * Parse GPS from CSV, JSON, or GPX text.
   * CSV format supported: timestamp,latitude,longitude,accuracy or lat,lng,timestamp
   * JSON format supported: Array of objects with timestamp/time, lat/latitude, lng/longitude, accuracy
   * Enforces planetary coordinate bounds [-90, 90] and [-180, 180] and sample count limit.
   */
  async parseGpsFile(filePath: string, maxSamples = 10000): Promise<GpsParseResult> {
    if (!filePath || !fs.existsSync(filePath)) {
      return {
        points: [],
        format: 'none',
        status: 'missing',
        sampleCount: 0
      };
    }

    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.size > 10 * 1024 * 1024) {
        return {
          points: [],
          format: 'csv',
          status: 'error',
          sampleCount: 0,
          error: 'GPS track file exceeds maximum allowed size of 10MB'
        };
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');
      const trimmed = content.trim();

      // Detect JSON array format
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return this.parseGpsSamples(trimmed, maxSamples);
      }

      const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const points: GpsPoint[] = [];

      let hasHeader = false;
      let timestampIdx = 0;
      let latIdx = 1;
      let lngIdx = 2;
      let accuracyIdx = 3;

      for (let i = 0; i < lines.length; i++) {
        if (points.length >= maxSamples) {
          logger.warn({ maxSamples }, 'GPS sample count reached maximum configured limit');
          break;
        }

        const line = lines[i];
        if (line.startsWith('#')) continue;

        // Header detection
        if (i === 0 && (line.toLowerCase().includes('lat') || line.toLowerCase().includes('time'))) {
          hasHeader = true;
          const cols = line.toLowerCase().split(',').map((c) => c.trim());
          timestampIdx = cols.findIndex((c) => c.includes('time') || c.includes('ts'));
          latIdx = cols.findIndex((c) => c.includes('lat'));
          lngIdx = cols.findIndex((c) => c.includes('lng') || c.includes('lon'));
          accuracyIdx = cols.findIndex((c) => c.includes('acc'));
          if (timestampIdx === -1) timestampIdx = 0;
          if (latIdx === -1) latIdx = 1;
          if (lngIdx === -1) lngIdx = 2;
          continue;
        }

        const parts = line.split(',');
        if (parts.length >= 3) {
          let lat: number;
          let lng: number;
          let timestampMs: number;
          let accuracy: number | undefined;

          if (hasHeader) {
            timestampMs = this.parseTimestamp(parts[timestampIdx]);
            lat = parseFloat(parts[latIdx]);
            lng = parseFloat(parts[lngIdx]);
            if (accuracyIdx !== -1 && parts[accuracyIdx]) {
              accuracy = parseFloat(parts[accuracyIdx]);
            }
          } else {
            const p0 = parseFloat(parts[0]);
            const p1 = parseFloat(parts[1]);
            const p2 = parseFloat(parts[2]);

            if (p0 > 1000) {
              // timestamp, lat, lng
              timestampMs = p0;
              lat = p1;
              lng = p2;
            } else {
              // lat, lng, timestamp
              lat = p0;
              lng = p1;
              timestampMs = p2;
            }

            if (parts.length >= 4) {
              accuracy = parseFloat(parts[3]);
            }
          }

          if (this.isValidCoordinate(lat, lng) && !isNaN(timestampMs) && timestampMs >= 0) {
            points.push({ lat, lng, timestampMs, accuracy });
          }
        }
      }

      const status = points.length > 0 ? 'available' : 'unaligned';
      logger.info({ parsedPoints: points.length, status }, 'GPS track parsing completed');

      return {
        points,
        format: 'csv',
        status,
        sampleCount: points.length
      };
    } catch (error: any) {
      logger.error({ error: error.message, filePath }, 'Failed to parse GPS file');
      return {
        points: [],
        format: 'csv',
        status: 'error',
        sampleCount: 0,
        error: error.message || 'GPS parsing failed'
      };
    }
  }

  /**
   * Parse GPS samples from raw JSON string or object array.
   */
  parseGpsSamples(rawInput: unknown, maxSamples = 10000): GpsParseResult {
    if (!rawInput) {
      return { points: [], format: 'none', status: 'missing', sampleCount: 0 };
    }

    try {
      let array: any[] = [];
      if (typeof rawInput === 'string') {
        const parsed = JSON.parse(rawInput);
        if (Array.isArray(parsed)) array = parsed;
      } else if (Array.isArray(rawInput)) {
        array = rawInput;
      }

      if (!array.length) {
        return { points: [], format: 'none', status: 'missing', sampleCount: 0 };
      }

      const points: GpsPoint[] = [];
      for (const item of array) {
        if (points.length >= maxSamples) break;
        const lat = parseFloat(item.latitude ?? item.lat);
        const lng = parseFloat(item.longitude ?? item.lng ?? item.lon);
        const timestampMs = this.parseTimestamp(item.timestamp ?? item.time ?? item.timestampMs);
        const accuracy = item.accuracy !== undefined ? parseFloat(item.accuracy) : undefined;

        if (this.isValidCoordinate(lat, lng) && !isNaN(timestampMs) && timestampMs >= 0) {
          points.push({ lat, lng, timestampMs, accuracy });
        }
      }

      const status = points.length > 0 ? 'available' : 'unaligned';
      return {
        points,
        format: 'json',
        status,
        sampleCount: points.length
      };
    } catch (err: any) {
      return {
        points: [],
        format: 'json',
        status: 'error',
        sampleCount: 0,
        error: err?.message || 'Malformed GPS samples JSON'
      };
    }
  }

  private parseTimestamp(val: any): number {
    if (val === undefined || val === null) return NaN;
    if (typeof val === 'number') return val;
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) return num;
    const parsedDate = Date.parse(val);
    return isNaN(parsedDate) ? NaN : parsedDate;
  }

  isValidCoordinate(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      isFinite(lat) &&
      isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  /**
   * Matches video timestamp to GPS points within an explicit tolerance window (default 3500ms).
   * STRICT REQUIREMENT: Does NOT invent coordinates when GPS is missing or outside tolerance.
   * Returns null coordinates if no trustworthy match exists.
   */
  matchCoordinates(
    points: GpsPoint[],
    videoTimestampMs: number,
    toleranceMs = 3500
  ): { lat: number | null; lng: number | null; isExactMatch: boolean } {
    if (!points || points.length === 0) {
      // Do not invent fake coordinates
      return {
        lat: null,
        lng: null,
        isExactMatch: false
      };
    }

    let closest = points[0];
    let minDiff = Math.abs(points[0].timestampMs - videoTimestampMs);

    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].timestampMs - videoTimestampMs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = points[i];
      }
    }

    if (minDiff <= toleranceMs) {
      return {
        lat: closest.lat,
        lng: closest.lng,
        isExactMatch: true
      };
    }

    // Outside tolerance window: preserve detection without claiming verified coordinates
    return {
      lat: null,
      lng: null,
      isExactMatch: false
    };
  }
}
