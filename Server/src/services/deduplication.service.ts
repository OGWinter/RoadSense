import { IssueSeverity, IssueType } from '../shared/types';
import { RawDetection } from '../infrastructure/ai/ai.interface';

export interface EnrichedDetection extends RawDetection {
  lat: number | null;
  lng: number | null;
  severity: IssueSeverity;
  priorityScore: number;
  title: string;
}

export class DeduplicationService {
  /**
   * Calculate Haversine distance in meters between two lat/lng coordinates.
   */
  calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Determines heuristic severity based on detection properties.
   * NOTE: Bounding-box area alone does not measure physical pothole depth.
   */
  calculateSeverity(type: IssueType, confidence: number, boxAreaFraction: number): IssueSeverity {
    if (type === 'pothole') {
      if (confidence > 0.85 && boxAreaFraction > 0.05) return 'critical';
      if (confidence > 0.75) return 'high';
      if (confidence > 0.6) return 'medium';
      return 'low';
    }

    if (type === 'crack') {
      if (boxAreaFraction > 0.08) return 'high';
      if (confidence > 0.7) return 'medium';
      return 'low';
    }

    return 'low';
  }

  /**
   * Produces a deterministic priority score (0-100) using severity and model confidence.
   */
  calculatePriorityScore(severity: IssueSeverity, confidence: number): number {
    const severityWeights: Record<IssueSeverity, number> = {
      critical: 50,
      high: 35,
      medium: 20,
      low: 10
    };

    const baseWeight = severityWeights[severity];
    const confidenceComponent = Math.round(confidence * 50);
    const score = Math.min(100, Math.max(1, baseWeight + confidenceComponent));
    return score;
  }

  /**
   * Deduplicates sequential/redundant detections within spatial threshold (15m) and time window (4s).
   * Supports null GPS coordinates safely.
   */
  deduplicateDetections(
    detections: EnrichedDetection[],
    distanceThresholdMeters = 15,
    timeWindowMs = 4000
  ): EnrichedDetection[] {
    const uniqueDetections: EnrichedDetection[] = [];

    for (const current of detections) {
      const isDuplicate = uniqueDetections.some((existing) => {
        const sameType = existing.type === current.type;
        const timeDiff = Math.abs(existing.videoTimestampMs - current.videoTimestampMs);

        // Case 1: Both have verified GPS coordinates
        if (existing.lat !== null && existing.lng !== null && current.lat !== null && current.lng !== null) {
          const distance = this.calculateDistanceMeters(
            existing.lat,
            existing.lng,
            current.lat,
            current.lng
          );
          return sameType && timeDiff <= timeWindowMs && distance <= distanceThresholdMeters;
        }

        // Case 2: Both lack GPS coordinates: merge purely on sequential temporal proximity
        if (existing.lat === null && current.lat === null) {
          return sameType && timeDiff <= timeWindowMs;
        }

        // One has GPS and the other doesn't: do not merge
        return false;
      });

      if (!isDuplicate) {
        uniqueDetections.push(current);
      }
    }

    return uniqueDetections;
  }
}
