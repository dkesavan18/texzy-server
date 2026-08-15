import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface ObjectHead {
  contentType: string | null;
  contentLength: number | null;
}

@Injectable()
export class R2StorageService {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;
  private readonly presignExpiresSeconds: number;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('storage.r2.accountId');
    this.bucketName = this.configService.get<string>(
      'storage.r2.bucketName',
    ) as string;
    this.publicBaseUrl = (
      this.configService.get<string>('storage.r2.publicBaseUrl') ?? ''
    ).replace(/\/+$/, '');
    this.presignExpiresSeconds = this.configService.get<number>(
      'storage.r2.presignExpiresSeconds',
    ) as number;

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get<string>(
          'storage.r2.accessKeyId',
        ) as string,
        secretAccessKey: this.configService.get<string>(
          'storage.r2.secretAccessKey',
        ) as string,
      },
    });
  }

  /** Generate a presigned PUT URL the client uses to upload the object directly to R2. */
  async getPresignedPutUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: this.presignExpiresSeconds,
    });
  }

  /** Returns object metadata, or null if the object does not exist. */
  async headObject(key: string): Promise<ObjectHead | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
      return {
        contentType: result.ContentType ?? null,
        contentLength: result.ContentLength ?? null,
      };
    } catch {
      return null;
    }
  }

  /** Fetches the full object body as a Buffer (used as the thumbnail source). */
  async getObjectBuffer(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    const chunks: Buffer[] = [];
    const body = result.Body as AsyncIterable<Buffer>;
    for await (const chunk of body) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.deleteObjects([key]);
  }

  async deleteObjects(keys: string[]): Promise<void> {
    const validKeys = keys.filter((key): key is string => Boolean(key));
    if (validKeys.length === 0) {
      return;
    }
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: { Objects: validKeys.map((Key) => ({ Key })) },
      }),
    );
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  /** Derives the object's public URL back into its storage key. */
  getKeyFromUrl(url: string): string | null {
    if (!url.startsWith(this.publicBaseUrl)) {
      return null;
    }
    return url.slice(this.publicBaseUrl.length + 1);
  }

  /** e.g. `products/55/8f1e....jpg` -> `products/55/thumbnails/8f1e....webp` */
  deriveThumbnailKey(key: string): string {
    const lastSlashIndex = key.lastIndexOf('/');
    const dir = lastSlashIndex === -1 ? '' : key.slice(0, lastSlashIndex + 1);
    const fileName =
      lastSlashIndex === -1 ? key : key.slice(lastSlashIndex + 1);
    const baseName = fileName.replace(/\.[^./]+$/, '');
    return `${dir}thumbnails/${baseName}.webp`;
  }
}
