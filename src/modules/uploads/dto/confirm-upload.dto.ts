import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { UploadEntityType } from '../types/upload-entity-type';
import { UPLOAD_ENTITY_TYPES } from '../types/upload-entity-type';

export class ConfirmUploadDto {
  @ApiProperty({ enum: UPLOAD_ENTITY_TYPES })
  @IsIn(UPLOAD_ENTITY_TYPES)
  entityType: UploadEntityType;

  @ApiPropertyOptional({
    description:
      'Required for product, need, need-response, collection-cover. Not used for profile-logo/profile-cover.',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ description: 'Storage key returned by /uploads/presign' })
  @IsString()
  storageKey: string;

  @ApiPropertyOptional({ default: 'image' })
  @IsOptional()
  @IsString()
  mediaType?: string;

  @ApiPropertyOptional({
    description: 'Junction types only — force this image as the primary one',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Junction types only' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
