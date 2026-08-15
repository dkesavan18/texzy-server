import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { JunctionEntityType } from '../types/upload-entity-type';
import { JUNCTION_ENTITY_TYPES } from '../types/upload-entity-type';

export class MediaEntityTypeQueryDto {
  @ApiProperty({ enum: JUNCTION_ENTITY_TYPES })
  @IsIn(JUNCTION_ENTITY_TYPES)
  entityType: JunctionEntityType;
}
