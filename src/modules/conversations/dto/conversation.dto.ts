import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty()
  @IsNumberString()
  sellerUserId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  statusCategoryId?: string;
}

export class CreateConversationEventDto {
  @ApiProperty()
  @IsString()
  eventType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  payload?: Record<string, unknown>;
}
