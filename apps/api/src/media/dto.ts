import { IsIn, IsInt, Min } from 'class-validator';
import type { MediaPurpose } from './media.repository.js';

/** Multipart text field alongside the binary `file` part (OpenAPI uploadMedia). */
export class UploadMediaDto {
  @IsIn(['scan', 'report', 'resolution', 'avatar', 'community', 'activity_evidence'])
  purpose!: MediaPurpose;
}

/** JSON metadata used to mint a short-lived direct-to-R2 upload URL. */
export class CreateMediaUploadDto {
  @IsIn(['scan', 'report', 'resolution', 'avatar', 'community', 'activity_evidence'])
  purpose!: MediaPurpose;

  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: 'image/jpeg' | 'image/png' | 'image/webp';

  @IsInt()
  @Min(1)
  sizeBytes!: number;
}
