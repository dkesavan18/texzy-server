import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import sharp from 'sharp';
import type { FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { R2StorageService } from '../../common/storage/r2-storage.service';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import {
  Collection,
  Need,
  NeedMedia,
  NeedResponse,
  Product,
  ProductMedia,
  Profile,
  ResponseMedia,
} from '../../database/entities';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import type {
  JunctionEntityType,
  SingleFieldEntityType,
  UploadEntityType,
} from './types/upload-entity-type';
import { JUNCTION_ENTITY_TYPES } from './types/upload-entity-type';

interface OwnershipResolution {
  /** Id used to build the storage key: entityId for owned resources, userId for profile media. */
  scopeId: string;
  profile?: Profile;
}

export interface UploadedFilePayload {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class UploadsService {
  private readonly maxFileSizeBytes: number;
  private readonly allowedMimeTypes: string[];
  private readonly thumbnailMaxWidth: number;
  private readonly thumbnailQuality: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: R2StorageService,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductMedia)
    private readonly productMediaRepository: Repository<ProductMedia>,
    @InjectRepository(Need)
    private readonly needsRepository: Repository<Need>,
    @InjectRepository(NeedMedia)
    private readonly needMediaRepository: Repository<NeedMedia>,
    @InjectRepository(NeedResponse)
    private readonly needResponsesRepository: Repository<NeedResponse>,
    @InjectRepository(ResponseMedia)
    private readonly responseMediaRepository: Repository<ResponseMedia>,
    @InjectRepository(Collection)
    private readonly collectionsRepository: Repository<Collection>,
    @InjectRepository(Profile)
    private readonly profilesRepository: Repository<Profile>,
  ) {
    this.maxFileSizeBytes = this.configService.get<number>(
      'storage.upload.maxFileSizeBytes',
    ) as number;
    this.allowedMimeTypes = this.configService.get<string[]>(
      'storage.upload.allowedMimeTypes',
    ) as string[];
    this.thumbnailMaxWidth = this.configService.get<number>(
      'storage.thumbnail.maxWidth',
    ) as number;
    this.thumbnailQuality = this.configService.get<number>(
      'storage.thumbnail.quality',
    ) as number;
  }

  async requestUpload(user: AuthUser, dto: RequestUploadDto) {
    this.assertAllowedContentType(dto.contentType);
    const { scopeId } = await this.validateOwnership(
      user,
      dto.entityType,
      dto.entityId,
    );
    const storageKey = this.buildStorageKey(
      dto.entityType,
      scopeId,
      dto.fileName,
    );
    const uploadUrl = await this.storageService.getPresignedPutUrl(
      storageKey,
      dto.contentType,
    );

    return {
      uploadUrl,
      storageKey,
      publicUrl: this.storageService.getPublicUrl(storageKey),
      expiresInSeconds: this.configService.get<number>(
        'storage.r2.presignExpiresSeconds',
      ),
    };
  }

  /**
   * Proxy upload through the API (avoids R2 bucket CORS preflight failures in browsers).
   * Call after /presign with the returned storageKey.
   */
  async uploadObject(
    user: AuthUser,
    dto: { storageKey: string; entityType: UploadEntityType; entityId?: string },
    file: UploadedFilePayload,
  ) {
    this.assertAllowedContentType(file.mimetype);

    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File exceeds maximum size of ${this.maxFileSizeBytes} bytes`,
      );
    }

    const { scopeId } = await this.validateOwnership(
      user,
      dto.entityType,
      dto.entityId,
    );
    this.assertStorageKeyMatchesEntity(
      dto.storageKey,
      dto.entityType,
      scopeId,
    );

    await this.storageService.putObject(
      dto.storageKey,
      file.buffer,
      file.mimetype,
    );

    return {
      success: true as const,
      storageKey: dto.storageKey,
      publicUrl: this.storageService.getPublicUrl(dto.storageKey),
    };
  }

  async confirmUpload(user: AuthUser, dto: ConfirmUploadDto) {
    // Presign and confirm are separate calls — never trust the client between steps.
    const { scopeId, profile } = await this.validateOwnership(
      user,
      dto.entityType,
      dto.entityId,
    );

    const head = await this.storageService.headObject(dto.storageKey);
    if (!head) {
      throw new BadRequestException(
        'Uploaded object not found in storage. Upload may have failed or expired.',
      );
    }
    if (head.contentLength && head.contentLength > this.maxFileSizeBytes) {
      await this.storageService.deleteObject(dto.storageKey);
      throw new BadRequestException(
        `File exceeds maximum allowed size of ${this.maxFileSizeBytes} bytes`,
      );
    }

    if (this.isJunctionType(dto.entityType)) {
      return this.confirmJunctionUpload(dto, dto.entityType, scopeId);
    }
    return this.confirmSingleFieldUpload(dto, dto.entityType, profile);
  }

  async updateMedia(
    user: AuthUser,
    mediaId: string,
    entityType: JunctionEntityType,
    dto: UpdateMediaDto,
  ) {
    switch (entityType) {
      case 'product':
        return this.updateProductMedia(user, mediaId, dto);
      case 'need':
        return this.updateNeedMedia(user, mediaId, dto);
      case 'need-response':
        return this.updateResponseMedia(user, mediaId, dto);
    }
  }

  async deleteMedia(
    user: AuthUser,
    mediaId: string,
    entityType: JunctionEntityType,
  ) {
    switch (entityType) {
      case 'product':
        return this.deleteProductMedia(user, mediaId);
      case 'need':
        return this.deleteNeedMedia(user, mediaId);
      case 'need-response':
        return this.deleteResponseMedia(user, mediaId);
    }
  }

  async deleteSingle(
    user: AuthUser,
    entityType: SingleFieldEntityType,
    entityId?: string,
  ) {
    switch (entityType) {
      case 'profile-logo': {
        const profile = await this.getOrCreateProfile(user.userId);
        await this.deleteOldObjectIfAny(profile.profileImage);
        profile.profileImage = null;
        profile.updatedAt = dbTimetzNow();
        await this.profilesRepository.save(profile);
        return { success: true };
      }
      case 'profile-cover': {
        const profile = await this.getOrCreateProfile(user.userId);
        await this.deleteOldObjectIfAny(profile.coverImage);
        profile.coverImage = null;
        profile.updatedAt = dbTimetzNow();
        await this.profilesRepository.save(profile);
        return { success: true };
      }
      case 'collection-cover': {
        const collection = await this.requireEntity(
          this.collectionsRepository,
          'collectionId',
          entityId,
          'Collection',
        );
        this.assertOwner(collection.userId, user.userId, 'collections');
        await this.deleteOldObjectIfAny(collection.coverImageUrl);
        collection.coverImageUrl = null;
        collection.updatedAt = dbTimetzNow();
        await this.collectionsRepository.save(collection);
        return { success: true };
      }
    }
  }

  // ---------------------------------------------------------------------
  // Ownership validation map
  // ---------------------------------------------------------------------

  private async validateOwnership(
    user: AuthUser,
    entityType: UploadEntityType,
    entityId?: string,
  ): Promise<OwnershipResolution> {
    switch (entityType) {
      case 'product': {
        const product = await this.requireEntity(
          this.productsRepository,
          'productId',
          entityId,
          'Product',
        );
        this.assertOwner(product.userId, user.userId, 'products');
        return { scopeId: product.productId };
      }
      case 'need': {
        const need = await this.requireEntity(
          this.needsRepository,
          'needId',
          entityId,
          'Need',
        );
        this.assertOwner(need.userId, user.userId, 'needs');
        return { scopeId: need.needId };
      }
      case 'need-response': {
        const response = await this.requireEntity(
          this.needResponsesRepository,
          'needResponseId',
          entityId,
          'Need response',
        );
        this.assertOwner(response.reponsedBy, user.userId, 'need responses');
        return { scopeId: response.needResponseId };
      }
      case 'collection-cover': {
        const collection = await this.requireEntity(
          this.collectionsRepository,
          'collectionId',
          entityId,
          'Collection',
        );
        this.assertOwner(collection.userId, user.userId, 'collections');
        return { scopeId: collection.collectionId };
      }
      case 'profile-logo':
      case 'profile-cover': {
        const profile = await this.getOrCreateProfile(user.userId);
        return { scopeId: user.userId, profile };
      }
    }
  }

  private async getOrCreateProfile(userId: string): Promise<Profile> {
    let profile = await this.profilesRepository.findOne({
      where: { userId },
    });
    if (!profile) {
      const now = dbTimetzNow();
      profile = this.profilesRepository.create({
        userId,
        createdAt: now,
        updatedAt: now,
      });
      profile = await this.profilesRepository.save(profile);
    }
    return profile;
  }

  private async requireEntity<T extends ObjectLiteral>(
    repository: Repository<T>,
    idField: keyof T & string,
    entityId: string | undefined,
    label: string,
  ): Promise<T> {
    if (!entityId) {
      throw new BadRequestException(
        `entityId is required for ${label.toLowerCase()} uploads`,
      );
    }
    const where = { [idField]: entityId } as FindOptionsWhere<T>;
    const entity = await repository.findOne({ where });
    if (!entity) {
      throw new NotFoundException(`${label} ${entityId} not found`);
    }
    return entity;
  }

  private assertOwner(
    ownerId: string | null,
    userId: string,
    resourceLabel: string,
  ) {
    if (ownerId && ownerId !== userId) {
      throw new ForbiddenException(
        `You can only upload images to your own ${resourceLabel}`,
      );
    }
  }

  // ---------------------------------------------------------------------
  // Key naming
  // ---------------------------------------------------------------------

  private buildStorageKey(
    entityType: UploadEntityType,
    scopeId: string,
    fileName: string,
  ): string {
    const ext = extname(fileName).replace('.', '').toLowerCase() || 'jpg';
    const uuid = randomUUID();
    switch (entityType) {
      case 'product':
        return `products/${scopeId}/${uuid}.${ext}`;
      case 'need':
        return `needs/${scopeId}/${uuid}.${ext}`;
      case 'need-response':
        return `need-responses/${scopeId}/${uuid}.${ext}`;
      case 'collection-cover':
        return `collections/${scopeId}/${uuid}.${ext}`;
      case 'profile-logo':
        return `profiles/${scopeId}/logo-${uuid}.${ext}`;
      case 'profile-cover':
        return `profiles/${scopeId}/cover-${uuid}.${ext}`;
    }
  }

  private getStorageKeyPrefix(
    entityType: UploadEntityType,
    scopeId: string,
  ): string {
    switch (entityType) {
      case 'product':
        return `products/${scopeId}`;
      case 'need':
        return `needs/${scopeId}`;
      case 'need-response':
        return `need-responses/${scopeId}`;
      case 'collection-cover':
        return `collections/${scopeId}`;
      case 'profile-logo':
      case 'profile-cover':
        return `profiles/${scopeId}`;
    }
  }

  private assertStorageKeyMatchesEntity(
    storageKey: string,
    entityType: UploadEntityType,
    scopeId: string,
  ) {
    const prefix = this.getStorageKeyPrefix(entityType, scopeId);
    if (!storageKey.startsWith(`${prefix}/`)) {
      throw new BadRequestException(
        'storageKey does not match this upload request',
      );
    }
  }

  private assertAllowedContentType(contentType: string) {
    if (!this.allowedMimeTypes.includes(contentType)) {
      throw new BadRequestException(
        `Content type ${contentType} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  private isJunctionType(
    entityType: UploadEntityType,
  ): entityType is JunctionEntityType {
    return (JUNCTION_ENTITY_TYPES as string[]).includes(entityType);
  }

  // ---------------------------------------------------------------------
  // Confirm — junction types (thumbnail generated via sharp)
  // ---------------------------------------------------------------------

  private async confirmJunctionUpload(
    dto: ConfirmUploadDto,
    entityType: JunctionEntityType,
    scopeId: string,
  ) {
    const thumbnailKey = this.storageService.deriveThumbnailKey(dto.storageKey);
    const originalBuffer = await this.storageService.getObjectBuffer(
      dto.storageKey,
    );
    const thumbnailBuffer = await sharp(originalBuffer)
      .resize({ width: this.thumbnailMaxWidth, withoutEnlargement: true })
      .webp({ quality: this.thumbnailQuality })
      .toBuffer();
    await this.storageService.putObject(
      thumbnailKey,
      thumbnailBuffer,
      'image/webp',
    );

    const mediaUrl = this.storageService.getPublicUrl(dto.storageKey);
    const thumbnailUrl = this.storageService.getPublicUrl(thumbnailKey);
    const now = dbTimetzNow();

    switch (entityType) {
      case 'product':
        return this.createProductMedia(
          scopeId,
          dto,
          mediaUrl,
          thumbnailUrl,
          now,
        );
      case 'need':
        return this.createNeedMedia(scopeId, dto, mediaUrl, thumbnailUrl, now);
      case 'need-response':
        return this.createResponseMedia(
          scopeId,
          dto,
          mediaUrl,
          thumbnailUrl,
          now,
        );
    }
  }

  private async createProductMedia(
    productId: string,
    dto: ConfirmUploadDto,
    mediaUrl: string,
    thumbnailUrl: string,
    now: string,
  ) {
    const existingCount = await this.productMediaRepository.count({
      where: { productId, isActive: true },
    });
    if (dto.isPrimary && existingCount > 0) {
      await this.productMediaRepository.update(
        { productId, isPrimary: true },
        { isPrimary: false },
      );
    }
    const media = this.productMediaRepository.create({
      productId,
      mediaType: dto.mediaType ?? 'image',
      storageKey: dto.storageKey,
      mediaUrl,
      thumbnailUrl,
      displayOrder: dto.displayOrder ?? existingCount,
      isPrimary: existingCount === 0 ? true : Boolean(dto.isPrimary),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return this.productMediaRepository.save(media);
  }

  private async createNeedMedia(
    needId: string,
    dto: ConfirmUploadDto,
    mediaUrl: string,
    thumbnailUrl: string,
    now: string,
  ) {
    const existingCount = await this.needMediaRepository.count({
      where: { needId, isActive: true },
    });
    if (dto.isPrimary && existingCount > 0) {
      await this.needMediaRepository.update(
        { needId, isPrimary: true },
        { isPrimary: false },
      );
    }
    const media = this.needMediaRepository.create({
      needId,
      mediaType: dto.mediaType ?? 'image',
      storageKey: dto.storageKey,
      mediaUrl,
      thumbnailUrl,
      displayOrder: dto.displayOrder ?? existingCount,
      isPrimary: existingCount === 0 ? true : Boolean(dto.isPrimary),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return this.needMediaRepository.save(media);
  }

  private async createResponseMedia(
    needResponseId: string,
    dto: ConfirmUploadDto,
    mediaUrl: string,
    thumbnailUrl: string,
    now: string,
  ) {
    const existingCount = await this.responseMediaRepository.count({
      where: { needResponseId, isActive: true },
    });
    if (dto.isPrimary && existingCount > 0) {
      await this.responseMediaRepository.update(
        { needResponseId, isPrimary: true },
        { isPrimary: false },
      );
    }
    const media = this.responseMediaRepository.create({
      needResponseId,
      mediaType: dto.mediaType ?? 'image',
      storageKey: dto.storageKey,
      mediaUrl,
      thumbnailUrl,
      displayOrder: dto.displayOrder ?? existingCount,
      isPrimary: existingCount === 0 ? true : Boolean(dto.isPrimary),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return this.responseMediaRepository.save(media);
  }

  // ---------------------------------------------------------------------
  // Confirm — single-field types (no thumbnail column)
  // ---------------------------------------------------------------------

  private async confirmSingleFieldUpload(
    dto: ConfirmUploadDto,
    entityType: SingleFieldEntityType,
    profile?: Profile,
  ) {
    const mediaUrl = this.storageService.getPublicUrl(dto.storageKey);
    const now = dbTimetzNow();

    switch (entityType) {
      case 'profile-logo': {
        const target = profile as Profile;
        await this.deleteOldObjectIfAny(target.profileImage);
        target.profileImage = mediaUrl;
        target.updatedAt = now;
        const saved = await this.profilesRepository.save(target);
        return { entityType, url: saved.profileImage, profile: saved };
      }
      case 'profile-cover': {
        const target = profile as Profile;
        await this.deleteOldObjectIfAny(target.coverImage);
        target.coverImage = mediaUrl;
        target.updatedAt = now;
        const saved = await this.profilesRepository.save(target);
        return { entityType, url: saved.coverImage, profile: saved };
      }
      case 'collection-cover': {
        const collection = await this.requireEntity(
          this.collectionsRepository,
          'collectionId',
          dto.entityId,
          'Collection',
        );
        await this.deleteOldObjectIfAny(collection.coverImageUrl);
        collection.coverImageUrl = mediaUrl;
        collection.updatedAt = now;
        const saved = await this.collectionsRepository.save(collection);
        return {
          entityType,
          url: saved.coverImageUrl,
          collection: saved,
        };
      }
    }
  }

  private async deleteOldObjectIfAny(oldUrl: string | null) {
    if (!oldUrl) {
      return;
    }
    const key = this.storageService.getKeyFromUrl(oldUrl);
    if (key) {
      await this.storageService.deleteObject(key).catch(() => undefined);
    }
  }

  // ---------------------------------------------------------------------
  // Update media (reorder / set primary) — junction types only
  // ---------------------------------------------------------------------

  private async updateProductMedia(
    user: AuthUser,
    mediaId: string,
    dto: UpdateMediaDto,
  ) {
    const media = await this.productMediaRepository.findOne({
      where: { productMediaId: mediaId },
      relations: { product: true },
    });
    if (!media) {
      throw new NotFoundException(`Product media ${mediaId} not found`);
    }
    this.assertOwner(media.product?.userId ?? null, user.userId, 'products');

    if (dto.isPrimary === true && media.productId) {
      await this.productMediaRepository.update(
        { productId: media.productId, isPrimary: true },
        { isPrimary: false },
      );
    }
    if (dto.isPrimary !== undefined) {
      media.isPrimary = dto.isPrimary;
    }
    if (dto.displayOrder !== undefined) {
      media.displayOrder = dto.displayOrder;
    }
    media.updatedAt = dbTimetzNow();
    return this.productMediaRepository.save(media);
  }

  private async updateNeedMedia(
    user: AuthUser,
    mediaId: string,
    dto: UpdateMediaDto,
  ) {
    const media = await this.needMediaRepository.findOne({
      where: { needMediaId: mediaId },
      relations: { need: true },
    });
    if (!media) {
      throw new NotFoundException(`Need media ${mediaId} not found`);
    }
    this.assertOwner(media.need?.userId ?? null, user.userId, 'needs');

    if (dto.isPrimary === true && media.needId) {
      await this.needMediaRepository.update(
        { needId: media.needId, isPrimary: true },
        { isPrimary: false },
      );
    }
    if (dto.isPrimary !== undefined) {
      media.isPrimary = dto.isPrimary;
    }
    if (dto.displayOrder !== undefined) {
      media.displayOrder = dto.displayOrder;
    }
    media.updatedAt = dbTimetzNow();
    return this.needMediaRepository.save(media);
  }

  private async updateResponseMedia(
    user: AuthUser,
    mediaId: string,
    dto: UpdateMediaDto,
  ) {
    const media = await this.responseMediaRepository.findOne({
      where: { responseMediaId: mediaId },
      relations: { needResponse: true },
    });
    if (!media) {
      throw new NotFoundException(`Response media ${mediaId} not found`);
    }
    this.assertOwner(
      media.needResponse?.reponsedBy ?? null,
      user.userId,
      'need responses',
    );

    if (dto.isPrimary === true && media.needResponseId) {
      await this.responseMediaRepository.update(
        { needResponseId: media.needResponseId, isPrimary: true },
        { isPrimary: false },
      );
    }
    if (dto.isPrimary !== undefined) {
      media.isPrimary = dto.isPrimary;
    }
    if (dto.displayOrder !== undefined) {
      media.displayOrder = dto.displayOrder;
    }
    media.updatedAt = dbTimetzNow();
    return this.responseMediaRepository.save(media);
  }

  // ---------------------------------------------------------------------
  // Delete media — junction types only (hard-delete + R2 cleanup)
  // ---------------------------------------------------------------------

  private async deleteProductMedia(user: AuthUser, mediaId: string) {
    const media = await this.productMediaRepository.findOne({
      where: { productMediaId: mediaId },
      relations: { product: true },
    });
    if (!media) {
      throw new NotFoundException(`Product media ${mediaId} not found`);
    }
    this.assertOwner(media.product?.userId ?? null, user.userId, 'products');
    await this.deleteMediaObjects(media.storageKey);
    await this.productMediaRepository.remove(media);
    return { success: true };
  }

  private async deleteNeedMedia(user: AuthUser, mediaId: string) {
    const media = await this.needMediaRepository.findOne({
      where: { needMediaId: mediaId },
      relations: { need: true },
    });
    if (!media) {
      throw new NotFoundException(`Need media ${mediaId} not found`);
    }
    this.assertOwner(media.need?.userId ?? null, user.userId, 'needs');
    await this.deleteMediaObjects(media.storageKey);
    await this.needMediaRepository.remove(media);
    return { success: true };
  }

  private async deleteResponseMedia(user: AuthUser, mediaId: string) {
    const media = await this.responseMediaRepository.findOne({
      where: { responseMediaId: mediaId },
      relations: { needResponse: true },
    });
    if (!media) {
      throw new NotFoundException(`Response media ${mediaId} not found`);
    }
    this.assertOwner(
      media.needResponse?.reponsedBy ?? null,
      user.userId,
      'need responses',
    );
    await this.deleteMediaObjects(media.storageKey);
    await this.responseMediaRepository.remove(media);
    return { success: true };
  }

  private async deleteMediaObjects(storageKey: string | null) {
    if (!storageKey) {
      return;
    }
    const thumbnailKey = this.storageService.deriveThumbnailKey(storageKey);
    await this.storageService
      .deleteObjects([storageKey, thumbnailKey])
      .catch(() => undefined);
  }
}
