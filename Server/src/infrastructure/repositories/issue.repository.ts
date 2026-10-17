import mongoose, { Types, FilterQuery } from 'mongoose';
import { RoadIssueModel, IRoadIssueDocument } from '../models/roadIssue.model';
import { UploadModel } from '../models/upload.model';
import {
  DashboardStatsDTO,
  IssueSeverity,
  IssueStatus,
  IssueType,
  ReportSummaryDTO,
  RoadIssueDTO,
  IUserPayload,
  UploadStatus
} from '../../shared/types';

export interface IssueFilterOptions {
  severity?: IssueSeverity;
  status?: IssueStatus;
  type?: IssueType;
  sourceUploadId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class IssueRepository {
  private toDTO(doc: IRoadIssueDocument): RoadIssueDTO {
    const hasCoordinates =
      doc.location &&
      Array.isArray(doc.location.coordinates) &&
      doc.location.coordinates.length === 2 &&
      typeof doc.location.coordinates[0] === 'number' &&
      typeof doc.location.coordinates[1] === 'number';

    return {
      _id: (doc._id as Types.ObjectId).toString(),
      title: doc.title,
      type: doc.type,
      severity: doc.severity,
      confidence: doc.confidence,
      priorityScore: doc.priorityScore,
      location: hasCoordinates
        ? {
            lat: doc.location!.coordinates[1],
            lng: doc.location!.coordinates[0]
          }
        : null,
      status: doc.status,
      sourceUploadId: doc.sourceUploadId.toString(),
      videoTimestampMs: doc.videoTimestampMs,
      boundingBox: doc.boundingBox,
      isDemo: doc.isDemo,
      statusHistory: (doc.statusHistory || []).map((h) => ({
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        actorId: h.actorId ? h.actorId.toString() : '',
        actorRole: h.actorRole,
        reason: h.reason,
        timestamp: h.timestamp ? h.timestamp.toISOString() : new Date().toISOString()
      })),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }

  async findById(id: string): Promise<RoadIssueDTO | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await RoadIssueModel.findById(id).exec();
    return doc ? this.toDTO(doc) : null;
  }

  async findRawById(id: string): Promise<IRoadIssueDocument | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return RoadIssueModel.findById(id).exec();
  }

  async create(data: {
    title: string;
    type: IssueType;
    severity: IssueSeverity;
    confidence: number;
    priorityScore: number;
    lat: number | null;
    lng: number | null;
    status?: IssueStatus;
    sourceUploadId: string;
    videoTimestampMs?: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
    isDemo?: boolean;
  }): Promise<RoadIssueDTO> {
    const hasCoords = typeof data.lat === 'number' && typeof data.lng === 'number';
    const doc = await RoadIssueModel.create({
      title: data.title,
      type: data.type,
      severity: data.severity,
      confidence: data.confidence,
      priorityScore: data.priorityScore,
      location: hasCoords
        ? {
            type: 'Point',
            coordinates: [data.lng!, data.lat!] // GeoJSON [longitude, latitude]
          }
        : null,
      status: data.status || 'detected',
      sourceUploadId: new Types.ObjectId(data.sourceUploadId),
      videoTimestampMs: data.videoTimestampMs,
      boundingBox: data.boundingBox,
      isDemo: data.isDemo ?? false,
      statusHistory: []
    });

    return this.toDTO(doc);
  }

  async createMany(
    issues: Array<{
      title: string;
      type: IssueType;
      severity: IssueSeverity;
      confidence: number;
      priorityScore: number;
      lat: number | null;
      lng: number | null;
      status?: IssueStatus;
      sourceUploadId: string;
      videoTimestampMs?: number;
      boundingBox?: { x: number; y: number; width: number; height: number };
      isDemo?: boolean;
    }>
  ): Promise<RoadIssueDTO[]> {
    if (!issues.length) return [];

    const docsToInsert = issues.map((i) => {
      const hasCoords = typeof i.lat === 'number' && typeof i.lng === 'number';
      return {
        title: i.title,
        type: i.type,
        severity: i.severity,
        confidence: i.confidence,
        priorityScore: i.priorityScore,
        location: hasCoords
          ? {
              type: 'Point',
              coordinates: [i.lng!, i.lat!]
            }
          : null,
        status: i.status || 'detected',
        sourceUploadId: new Types.ObjectId(i.sourceUploadId),
        videoTimestampMs: i.videoTimestampMs,
        boundingBox: i.boundingBox,
        isDemo: i.isDemo ?? false,
        statusHistory: []
      };
    });

    const docs = await RoadIssueModel.insertMany(docsToInsert);
    return docs.map((doc) => this.toDTO(doc as unknown as IRoadIssueDocument));
  }

  async findFiltered(
    options: IssueFilterOptions
  ): Promise<{ issues: RoadIssueDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IRoadIssueDocument> = {};
    if (options.severity) filter.severity = options.severity;
    if (options.status) filter.status = options.status;
    if (options.type) filter.type = options.type;
    if (options.sourceUploadId && mongoose.isValidObjectId(options.sourceUploadId)) {
      filter.sourceUploadId = new Types.ObjectId(options.sourceUploadId);
    }

    const sortField = options.sortBy || 'createdAt';
    const sortDirection = options.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [docs, total] = await Promise.all([
      RoadIssueModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      RoadIssueModel.countDocuments(filter).exec()
    ]);

    return {
      issues: docs.map((doc) => this.toDTO(doc)),
      total,
      page,
      limit
    };
  }

  async updateStatus(
    id: string,
    newStatus: IssueStatus,
    actor?: { userId: string; role: string },
    reason?: string
  ): Promise<RoadIssueDTO | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await RoadIssueModel.findById(id).exec();
    if (!doc) return null;

    const previousStatus = doc.status;
    doc.status = newStatus;

    if (actor) {
      doc.statusHistory.push({
        previousStatus,
        newStatus,
        actorId: new Types.ObjectId(actor.userId),
        actorRole: actor.role,
        reason,
        timestamp: new Date()
      });
    }

    await doc.save();
    return this.toDTO(doc);
  }

  async getDashboardStats(filterUser?: IUserPayload): Promise<DashboardStatsDTO> {
    let issueFilter: FilterQuery<IRoadIssueDocument> = {};
    let uploadFilter: Record<string, any> = {};

    // Volunteer statistics respect upload ownership
    if (filterUser && filterUser.role === 'volunteer') {
      const userUploads = await UploadModel.find(
        { uploaderId: new Types.ObjectId(filterUser.userId) },
        '_id'
      ).exec();
      const uploadIds = userUploads.map((u) => u._id);
      uploadFilter = { uploaderId: new Types.ObjectId(filterUser.userId) };
      issueFilter = { sourceUploadId: { $in: uploadIds } };
    }

    const [
      totalIssues,
      criticalIssues,
      pendingRepairs,
      repairedIssues,
      allIssues,
      totalUploads,
      allUploads
    ] = await Promise.all([
      RoadIssueModel.countDocuments(issueFilter).exec(),
      RoadIssueModel.countDocuments({ ...issueFilter, severity: 'critical' }).exec(),
      RoadIssueModel.countDocuments({
        ...issueFilter,
        status: { $in: ['verified', 'repair_pending'] }
      }).exec(),
      RoadIssueModel.countDocuments({ ...issueFilter, status: 'repaired' }).exec(),
      RoadIssueModel.find(issueFilter, 'status severity').lean().exec(),
      UploadModel.countDocuments(uploadFilter).exec(),
      UploadModel.find(uploadFilter, 'status').lean().exec()
    ]);

    const byStatus: Record<IssueStatus, number> = {
      detected: 0,
      verified: 0,
      rejected: 0,
      repair_pending: 0,
      repaired: 0
    };

    const bySeverity: Record<IssueSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    for (const item of allIssues) {
      if (item.status && byStatus[item.status as IssueStatus] !== undefined) {
        byStatus[item.status as IssueStatus]++;
      }
      if (item.severity && bySeverity[item.severity as IssueSeverity] !== undefined) {
        bySeverity[item.severity as IssueSeverity]++;
      }
    }

    const uploadsByStatus: Record<UploadStatus, number> = {
      uploaded: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    for (const u of allUploads) {
      if (u.status && uploadsByStatus[u.status as UploadStatus] !== undefined) {
        uploadsByStatus[u.status as UploadStatus]++;
      }
    }

    return {
      totalIssues,
      criticalIssues,
      pendingRepairs,
      repairedIssues,
      byStatus,
      bySeverity,
      totalUploads,
      uploadsByStatus
    };
  }

  async getReportSummary(): Promise<ReportSummaryDTO> {
    const issues = await RoadIssueModel.find({}, 'severity status type priorityScore createdAt').lean().exec();

    const bySeverity: Record<IssueSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const byStatus: Record<IssueStatus, number> = {
      detected: 0,
      verified: 0,
      rejected: 0,
      repair_pending: 0,
      repaired: 0
    };

    const byType: Record<IssueType, number> = {
      pothole: 0,
      crack: 0,
      other: 0
    };

    let totalPriority = 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let recentDetectionsCount = 0;

    for (const item of issues) {
      if (item.severity && bySeverity[item.severity as IssueSeverity] !== undefined) {
        bySeverity[item.severity as IssueSeverity]++;
      }
      if (item.status && byStatus[item.status as IssueStatus] !== undefined) {
        byStatus[item.status as IssueStatus]++;
      }
      if (item.type && byType[item.type as IssueType] !== undefined) {
        byType[item.type as IssueType]++;
      }
      totalPriority += item.priorityScore || 0;
      if (item.createdAt && new Date(item.createdAt) >= sevenDaysAgo) {
        recentDetectionsCount++;
      }
    }

    const averagePriorityScore = issues.length > 0 ? Math.round((totalPriority / issues.length) * 10) / 10 : 0;

    return {
      bySeverity,
      byStatus,
      byType,
      recentDetectionsCount,
      averagePriorityScore
    };
  }

  async count(): Promise<number> {
    return RoadIssueModel.countDocuments().exec();
  }

  async deleteBySourceUploadId(uploadId: string): Promise<number> {
    if (!mongoose.isValidObjectId(uploadId)) return 0;
    const res = await RoadIssueModel.deleteMany({
      sourceUploadId: new Types.ObjectId(uploadId)
    }).exec();
    return res.deletedCount;
  }
}
