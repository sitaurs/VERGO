import { Injectable, PayloadTooLargeException } from '@nestjs/common';
import { getConfig } from '@sap/config';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client, type HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Baseline lifetime for a signed read URL (TECH_SPEC §5: "signed read URL pendek, ~5 menit"). */
export const SIGNED_URL_TTL_SECONDS = 300;
/** Upload URLs are short-lived and scoped to one opaque temporary object key. */
export const SIGNED_UPLOAD_URL_TTL_SECONDS = 300;

/**
 * Cloudflare R2 access via the S3-compatible API. Objects are always private;
 * clients can access them only through short-lived presigned GET/PUT URLs minted
 * here. The S3 client is lazy so importing this provider does not need credentials
 * or a network connection.
 */
@Injectable()
export class ObjectStorageService {
  private readonly config = getConfig();
  private client: S3Client | null = null;

  async putObject(input: { key: string; body: Buffer; contentType: string; sha256: string }): Promise<void> {
    const client = this.getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: this.config.S3_BUCKET,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ChecksumSHA256: Buffer.from(input.sha256, 'hex').toString('base64'),
      }),
      {abortSignal:AbortSignal.timeout(60000)},
    );
  }

  async createSignedGetUrl(key: string, ttlSeconds: number = SIGNED_URL_TTL_SECONDS): Promise<{ url: string; expiresAt: Date }> {
    const client = this.getClient();
    const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key }), {
      expiresIn: ttlSeconds,
    });
    return { url, expiresAt: new Date(Date.now() + ttlSeconds * 1_000) };
  }

  async createSignedPutUrl(key: string, contentType: string, ttlSeconds: number = SIGNED_UPLOAD_URL_TTL_SECONDS): Promise<{ url: string; expiresAt: Date }> {
    const client = this.getClient();
    const url = await getSignedUrl(client, new PutObjectCommand({
      Bucket: this.config.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    }), { expiresIn: ttlSeconds });
    return { url, expiresAt: new Date(Date.now() + ttlSeconds * 1_000) };
  }

  /** Read an upload only after checking its R2 size and pinning the GET to the observed ETag. */
  async getObjectBuffer(key: string, maxBytes: number): Promise<Buffer | null> {
    const client = this.getClient();
    let head: HeadObjectCommandOutput;
    try {
      head = await client.send(new HeadObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key }), {
        abortSignal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404 || (error as { name?: string }).name === 'NotFound' || (error as { name?: string }).name === 'NoSuchKey') return null;
      throw error;
    }
    const size = head.ContentLength;
    if (!Number.isSafeInteger(size) || size! < 0 || size! > maxBytes) {
      throw new PayloadTooLargeException({ code: 'IMAGE_TOO_LARGE', message: 'Berkas melebihi 10 MiB.' });
    }
    if (size === 0) return Buffer.alloc(0);
    if (!head.ETag) throw new Error('Object storage tidak memberikan ETag untuk upload.');

    const result = await client.send(new GetObjectCommand({
      Bucket: this.config.S3_BUCKET,
      Key: key,
      IfMatch: head.ETag,
    }), { abortSignal: AbortSignal.timeout(30_000) });
    if (!result.Body) return null;
    const bytes = Buffer.from(await result.Body.transformToByteArray());
    if (bytes.length > maxBytes) {
      throw new PayloadTooLargeException({ code: 'IMAGE_TOO_LARGE', message: 'Berkas melebihi 10 MiB.' });
    }
    if (bytes.length !== size) throw new Error('Object berubah saat dibaca dari penyimpanan.');
    return bytes;
  }

  async deleteObject(key:string):Promise<void> {
    await this.getClient().send(new DeleteObjectCommand({Bucket:this.config.S3_BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(60000)});
  }

  private getClient(): S3Client {
    if (this.client) return this.client;
    this.client = new S3Client({
      region: this.config.S3_REGION,
      endpoint: this.config.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.S3_ACCESS_KEY_ID,
        secretAccessKey: this.config.S3_SECRET_ACCESS_KEY,
      },
    });
    return this.client;
  }
}
