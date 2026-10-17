import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { MediaRepository } from '../media/media.repository.js';
import { evaluateRateLimit, RateLimitException, REPORT_RATE_LIMIT } from '../platform/http/rate-limit.js';
import { ScanRepository } from '../scans/scan.repository.js';
import type { CategoryId } from '../scans/scan.types.js';
import { toH3Cell } from './geo.js';
import { isOccurredAtValid, toReportView, type ReportStatus, type ReportView } from './report.types.js';
import { ReportRepository, type UpdateReportChanges } from './report.repository.js';
import type { ReportInputDto, ReportUpdateInputDto } from './dto.js';

export const REPORTS_ROUTE = 'POST /reports';
export const DEFAULT_REPORTS_PAGE = 20;

export interface ReportPageView {
  items: ReportView[];
  nextCursor: string | null;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly media: MediaRepository,
    private readonly scans: ScanRepository,
  ) {}

  async createReport(userId: string, dto: ReportInputDto, idempotencyKey: string, emailVerified = false): Promise<ReportView> {
    if ((dto.publicationChannels?.length ?? 0) > 0 && !emailVerified) {
      throw new ForbiddenException({ code: 'EMAIL_VERIFICATION_REQUIRED', message: 'Verifikasi email diperlukan untuk memberi izin publikasi.' });
    }
    this.validateObservation(dto.observationSource, dto.sourceReference ?? null);
    this.validatePhotoException(dto.mediaIds, dto.photoUnavailableReason ?? null, dto.publicationChannels ?? []);
    await this.enforceRateLimit(userId);

    const occurredAt = new Date(dto.occurredAt);
    if (!isOccurredAtValid(occurredAt)) {
      throw new UnprocessableEntityException({
        code: 'REPORT_INVALID',
        message: 'occurredAt tidak boleh di masa depan dan maksimal 30 hari sebelum sekarang.',
      });
    }

    await this.assertOwnedStoredMedia(userId, dto.mediaIds);
    const scanId = dto.scanId ?? null;
    if (scanId) await this.assertOwnedScan(userId, scanId);

    const categoryId = (dto.categoryId ?? null) as CategoryId | null;
    const requestHash = canonicalHash({
      mediaIds: dto.mediaIds,
      description: dto.description,
      observationSource: dto.observationSource,
      inference: dto.inference ?? null,
      sourceReference: dto.sourceReference ?? null,
      contextFlags: dto.contextFlags ?? [],
      photoUnavailableReason: dto.photoUnavailableReason ?? null,
      location: dto.location,
      occurredAt: dto.occurredAt,
      reportedSeverity: dto.reportedSeverity,
      categoryId,
      scanId,
      publicationChannels: dto.publicationChannels ?? [],
    });

    const { view } = await this.reports.createIdempotent({
      userId,
      mediaIds: dto.mediaIds,
      description: dto.description,
      observationSource: dto.observationSource,
      inference: dto.inference ?? null,
      sourceReference: dto.sourceReference ?? null,
      contextFlags: dto.contextFlags ?? [],
      photoUnavailableReason: dto.photoUnavailableReason ?? null,
      latitude: dto.location.latitude,
      longitude: dto.location.longitude,
      h3Cell: toH3Cell(dto.location.latitude, dto.location.longitude),
      occurredAt,
      reportedSeverity: dto.reportedSeverity,
      categoryId,
      scanId,
      publicationChannels: dto.publicationChannels ?? [],
      actorScope: `user:${userId}`,
      route: REPORTS_ROUTE,
      key: idempotencyKey,
      requestHash,
    });
    return view;
  }

  async getReport(userId: string, isAdmin: boolean, reportId: string): Promise<ReportView> {
    const record = await this.reports.findForViewer(reportId, userId, isAdmin);
    if (!record) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Laporan tidak ditemukan.' });
    return toReportView(record);
  }

  async listMyReports(
    userId: string,
    limit: number | undefined,
    cursor: string | undefined,
    status: ReportStatus | undefined,
  ): Promise<ReportPageView> {
    const pageSize = limit ?? DEFAULT_REPORTS_PAGE;
    const records = await this.reports.listByOwner(userId, pageSize + 1, cursor ?? null, status ?? null);
    const page = records.slice(0, pageSize);
    const nextCursor = records.length > pageSize ? page[page.length - 1]!.id : null;
    return { items: page.map(toReportView), nextCursor };
  }

  async updateReport(
    userId: string,
    reportId: string,
    ifMatchRevision: number,
    dto: ReportUpdateInputDto,
  ): Promise<ReportView> {
    const changes: UpdateReportChanges = {};
    let count = 0;

    if (dto.mediaIds !== undefined) {
      await this.assertOwnedStoredMedia(userId, dto.mediaIds);
      changes.mediaIds = dto.mediaIds;
      count += 1;
    }
    if (dto.description !== undefined) {
      changes.description = dto.description;
      count += 1;
    }
    if (dto.observationSource !== undefined || dto.sourceReference !== undefined || dto.mediaIds !== undefined || dto.photoUnavailableReason !== undefined) {
      const current = await this.reports.findForViewer(reportId, userId, false);
      if (!current) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Laporan tidak ditemukan.' });
      const source = dto.observationSource ?? current.observationSource;
      const sourceReference = dto.sourceReference !== undefined ? dto.sourceReference :
        dto.observationSource === 'firsthand' ? null : current.sourceReference;
      // Legacy source remains unknown unless the reporter explicitly supplies one.
      if (source !== null || sourceReference !== null) this.validateObservation(source, sourceReference);
      if (dto.observationSource !== undefined) { changes.observationSource = dto.observationSource; count += 1; }
      if (dto.sourceReference !== undefined || dto.observationSource === 'firsthand') {
        changes.sourceReference = sourceReference;
        count += 1;
      }
      const mediaIds = dto.mediaIds ?? current.evidenceMediaIds;
      const photoUnavailableReason = mediaIds.length > 0 ? null :
        dto.photoUnavailableReason !== undefined ? dto.photoUnavailableReason : current.photoUnavailableReason;
      if (dto.photoUnavailableReason === 'unsafe' && mediaIds.length > 0) {
        this.validatePhotoException(mediaIds, dto.photoUnavailableReason);
      }
      this.validatePhotoException(mediaIds, photoUnavailableReason);
      if (dto.mediaIds !== undefined || dto.photoUnavailableReason !== undefined) {
        changes.photoUnavailableReason = photoUnavailableReason;
        count += 1;
      }
    }
    if (dto.inference !== undefined) { changes.inference = dto.inference; count += 1; }
    if (dto.contextFlags !== undefined) { changes.contextFlags = dto.contextFlags; count += 1; }

    if (dto.reportedSeverity !== undefined) {
      changes.reportedSeverity = dto.reportedSeverity;
      count += 1;
    }
    if (dto.occurredAt !== undefined) {
      const occurredAt = new Date(dto.occurredAt);
      if (!isOccurredAtValid(occurredAt)) {
        throw new UnprocessableEntityException({
          code: 'REPORT_INVALID',
          message: 'occurredAt tidak boleh di masa depan dan maksimal 30 hari sebelum sekarang.',
        });
      }
      changes.occurredAt = occurredAt;
      count += 1;
    }
    if (dto.location !== undefined) {
      changes.latitude = dto.location.latitude;
      changes.longitude = dto.location.longitude;
      changes.h3Cell = toH3Cell(dto.location.latitude, dto.location.longitude);
      count += 1;
    }
    if (dto.categoryId !== undefined) {
      changes.categoryId = dto.categoryId as CategoryId | null;
      count += 1;
    }

    if (count === 0) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Minimal satu properti wajib diubah.' });
    }

    const result = await this.reports.updateOwnedSubmitted(reportId, userId, ifMatchRevision, changes);
    if (!result.ok) {
      switch (result.reason) {
        case 'not_found':
          throw new NotFoundException({ code: 'NOT_FOUND', message: 'Laporan tidak ditemukan.' });
        case 'not_editable':
          throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Hanya laporan submitted yang dapat diedit.' });
        case 'conflict':
          throw new ConflictException({ code: 'REVISION_CONFLICT', message: 'Revisi laporan sudah berubah.' });
      }
    }
    return toReportView(result.record);
  }

  private validateObservation(source: unknown, sourceReference: string | null): void {
    if (source !== 'firsthand' && source !== 'secondhand') {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Pilih sumber pengamatan: melihat langsung atau informasi pihak lain.' });
    }
    if (sourceReference !== null && source !== 'secondhand') {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Rujukan pihak lain hanya berlaku untuk informasi pihak lain.' });
    }
  }

  private validatePhotoException(mediaIds: string[], reason: unknown, publicationChannels: string[] = []): void {
    if (mediaIds.length === 0) {
      if (reason !== 'unsafe' || publicationChannels.length > 0) {
        throw new UnprocessableEntityException({ code: 'EVIDENCE_INVALID', message: 'Laporan tanpa foto hanya untuk kondisi tidak aman dan tidak dapat memberi izin publikasi.' });
      }
    } else if (reason !== null) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Alasan foto tidak tersedia hanya berlaku untuk laporan tanpa foto.' });
    }
  }

  private async assertOwnedStoredMedia(userId: string, mediaIds: string[]): Promise<void> {
    const found = await Promise.all(mediaIds.map((id) => this.media.findStoredForOwner(id, userId)));
    if (found.some((m) => m === null)) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Media tidak ditemukan.' });
    }
    if (found.some((m) => m!.purpose !== 'report')) {
      throw new UnprocessableEntityException({code:'EVIDENCE_INVALID',message:'Foto harus diunggah untuk laporan.'});
    }
  }

  private async assertOwnedScan(userId: string, scanId: string): Promise<void> {
    const scan = await this.scans.findByIdForOwner(scanId, userId);
    if (!scan) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Scan tidak ditemukan.' });
  }

  /** Baseline: 10 laporan/hari/account (TECH_SPEC §). 429 + Retry-After when exceeded. */
  private async enforceRateLimit(userId: string): Promise<void> {
    const now = Date.now();
    const state = await this.reports.countRecentForUser(userId, new Date(now - REPORT_RATE_LIMIT.windowMs));
    const decision = evaluateRateLimit(state, REPORT_RATE_LIMIT, now);
    if (!decision.allowed) throw new RateLimitException(decision.retryAfterSeconds);
  }
}

/** Stable hash of the canonical create payload for idempotent replay matching. */
function canonicalHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
