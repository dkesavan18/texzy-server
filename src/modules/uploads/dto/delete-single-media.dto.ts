import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { SingleFieldEntityType } from '../types/upload-entity-type';
import { SINGLE_FIELD_ENTITY_TYPES } from '../types/upload-entity-type';

export class DeleteSingleMediaQueryDto {
  @ApiProperty({ enum: SINGLE_FIELD_ENTITY_TYPES })
  @IsIn(SINGLE_FIELD_ENTITY_TYPES)
  entityType: SingleFieldEntityType;

  @ApiPropertyOptional({
    description:
      'Required for collection-cover. Not used for profile-logo/profile-cover.',
  })
  @IsOptional()
  @IsString()
  entityId?: string;
}
