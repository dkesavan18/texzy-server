import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { UploadEntityType } from '../types/upload-entity-type';
import { UPLOAD_ENTITY_TYPES } from '../types/upload-entity-type';

export class RequestUploadDto {
  @ApiProperty({ enum: UPLOAD_ENTITY_TYPES })
  @IsIn(UPLOAD_ENTITY_TYPES)
  entityType: UploadEntityType;

  @ApiPropertyOptional({
    description:
      'Required for product, need, need-response, collection-cover. Not used for profile-logo/profile-cover (resolved from the current user).',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ example: 'photo.jpg' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  contentType: string;
}
