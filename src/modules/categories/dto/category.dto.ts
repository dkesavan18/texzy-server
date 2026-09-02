import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  categoryName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  categoryTypeId?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class CreateCategoryTypeDto {
  @ApiProperty()
  @IsString()
  categoryType: string;
}
