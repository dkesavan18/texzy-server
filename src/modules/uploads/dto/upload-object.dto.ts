import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { UploadEntityType } from '../types/upload-entity-type';
import { UPLOAD_ENTITY_TYPES } from '../types/upload-entity-type';

/** Multipart fields sent with the file after /uploads/presign. */
export class UploadObjectDto {
  @ApiProperty({ description: 'Storage key returned by /uploads/presign' })
  @IsString()
  storageKey: string;

  @ApiProperty({ enum: UPLOAD_ENTITY_TYPES })
  @IsIn(UPLOAD_ENTITY_TYPES)
  entityType: UploadEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;
}
