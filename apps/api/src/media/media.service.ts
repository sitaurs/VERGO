import { BadRequestException, HttpException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ImageProcessorService, MAX_UPLOAD_BYTES, type ImageMime } from './image-processor.service.js';
import { MediaRepository, type MediaPurpose, type MediaRecord } from './media.repository.js';
import { ObjectStorageService } from './object-storage.service.js';
import { fail, requireFeature } from '../extensions/extension.store.js';

/** Orphan retention for freshly uploaded media (TECH_SPEC §5: "24 jam"). */
export const ORPHAN_TTL_MS = 24 * 60 * 60 * 1_000;

interface UploadedFile {
  buffer: Buffer;
  mimetype?: string;
  size?: number;
  originalname?: string;
}

export interface MediaView {
  id: string;
  purpose: MediaPurpose;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
}

export interface MediaUrlView {
  url: string;
  expiresAt: string;
}

export interface MediaUploadTicketView {
  mediaId: string;
  uploadUrl: string;
  method: 'PUT';
  headers: { 'Content-Type': ImageMime };
  expiresAt: string;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly processor: ImageProcessorService,
    private readonly storage: ObjectStorageService,
    private readonly repository: MediaRepository,
  ) {}

  async upload(ownerId: string, purpose: MediaPurpose, file: UploadedFile | undefined): Promise<MediaView> {
    this.assertPurposeEnabled(purpose);
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Berkas wajib diunggah.' });
    }

    const processed = await this.processor.process(file.buffer);
    const objectKey = `${purpose}/${ownerId}/${randomUUID()}.${processed.extension}`;

    // Reserve the object key durably before uploading. Cleanup can recover an interrupted upload.
    const reservation = await this.repository.createStored({
      ownerId,
      purpose,
      objectKey,
      mime: processed.mime,
      sizeBytes: processed.sizeBytes,
      sha256: processed.sha256,
      width: processed.width,
      height: processed.height,
      expiresAt: new Date(Date.now() + ORPHAN_TTL_MS),
    }, 'pending');
    try {
      await this.storage.putObject({key:objectKey,body:processed.buffer,contentType:processed.mime,sha256:processed.sha256});
      const record=await this.repository.markStored(reservation.id,ownerId);
      if(!record)fail(403,'ACCOUNT_INACTIVE','Akun atau unggahan tidak lagi aktif.');
      return this.toView(record);
    } catch(error) {
      await this.repository.scheduleObjectCleanup(objectKey,reservation.id).catch(()=>undefined);
      await this.storage.deleteObject(objectKey).catch(()=>undefined);
      throw error;
    }
  }

  async beginUpload(ownerId: string, purpose: MediaPurpose, contentType: ImageMime, sizeBytes: number): Promise<MediaUploadTicketView> {
    this.assertPurposeEnabled(purpose);
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Ukuran berkas tidak valid.' });
    if (sizeBytes > MAX_UPLOAD_BYTES) throw new PayloadTooLargeException({ code: 'IMAGE_TOO_LARGE', message: 'Berkas melebihi 10 MiB.' });
    const sourceObjectKey = `upload-pending/${ownerId}/${randomUUID()}`;
    const reservation = await this.repository.createUploadReservation({
      ownerId,
      purpose,
      objectKey: sourceObjectKey,
      mime: contentType,
      sizeBytes,
      expiresAt: new Date(Date.now() + ORPHAN_TTL_MS),
    });
    try {
      const signed = await this.storage.createSignedPutUrl(sourceObjectKey, contentType);
      return {
        mediaId: reservation.id,
        uploadUrl: signed.url,
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        expiresAt: signed.expiresAt.toISOString(),
      };
    } catch (error) {
      await this.repository.scheduleObjectCleanup(sourceObjectKey, reservation.id).catch(() => undefined);
      throw error;
    }
  }

  async completeUpload(ownerId: string, mediaId: string): Promise<MediaView> {
    const pending = await this.repository.findPendingUploadForOwner(mediaId, ownerId);
    if (!pending) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Unggahan tidak ditemukan atau sudah kedaluwarsa.' });

    let finalObjectKey: string | undefined;
    try {
      const original = await this.storage.getObjectBuffer(pending.objectKey, MAX_UPLOAD_BYTES);
      if (!original) throw new BadRequestException({ code: 'UPLOAD_INCOMPLETE', message: 'Berkas belum berhasil diunggah ke penyimpanan.' });
      const processed = await this.processor.process(original);
      finalObjectKey = `${pending.purpose}/${ownerId}/${randomUUID()}.${processed.extension}`;
      await this.storage.putObject({ key: finalObjectKey, body: processed.buffer, contentType: processed.mime, sha256: processed.sha256 });
      const record = await this.repository.completeUpload({
        id: pending.id,
        ownerId,
        sourceObjectKey: pending.objectKey,
        objectKey: finalObjectKey,
        mime: processed.mime,
        sizeBytes: processed.sizeBytes,
        sha256: processed.sha256,
        width: processed.width,
        height: processed.height,
        expiresAt: new Date(Date.now() + ORPHAN_TTL_MS),
      });
      if (!record) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Unggahan tidak ditemukan atau sudah kedaluwarsa.' });
      }
      await this.storage.deleteObject(pending.objectKey).catch(async () => {
        await this.repository.scheduleObjectCleanup(pending.objectKey, pending.id).catch(() => undefined);
      });
      return this.toView(record);
    } catch (error) {
      // Preserve the source object on infrastructure errors so the same pending
      // upload can be finalized again. Validation failures are permanent and
      // should release their temporary object immediately.
      if (error instanceof HttpException && error.getStatus() < 500) {
        await this.repository.scheduleObjectCleanup(pending.objectKey, pending.id).catch(() => undefined);
        await this.storage.deleteObject(pending.objectKey).catch(() => undefined);
        if (finalObjectKey) {
          await this.storage.deleteObject(finalObjectKey).catch(async () => {
            await this.repository.scheduleObjectCleanup(finalObjectKey!, pending.id).catch(() => undefined);
          });
        }
      }
      throw error;
    }
  }

  async createReadUrl(ownerId: string, mediaId: string): Promise<MediaUrlView> {
    const record = await this.repository.findStoredForOwner(mediaId, ownerId);
    if (!record) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Media tidak ditemukan.' });
    }
    const signed = await this.storage.createSignedGetUrl(record.objectKey);
    return { url: signed.url, expiresAt: signed.expiresAt.toISOString() };
  }

  private toView(record: MediaRecord): MediaView {
    return {
      id: record.id,
      purpose: record.purpose,
      mimeType: record.mime,
      sizeBytes: record.sizeBytes,
      expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    };
  }

  private assertPurposeEnabled(purpose: MediaPurpose): void {
    if (purpose === 'community') requireFeature('community');
    if (purpose === 'activity_evidence') requireFeature('activities');
  }
}
