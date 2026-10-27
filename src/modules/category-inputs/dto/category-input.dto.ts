import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  INPUT_STEPS,
  INPUT_TYPES,
} from '../../../database/entities/category-input-mapping.entity';

export class CreateCategoryInputDto {
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Product group or product type this field belongs to. Omit / null = applies to every product category.',
  })
  @IsOptional()
  @IsNumber()
  categoryId?: number | null;

  @ApiProperty({ example: 'zari_work_present' })
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'inputKey must be lower_snake_case' })
  inputKey: string;

  @ApiProperty({ example: 'Zari work present' })
  @IsString()
  @MaxLength(150)
  inputLabel: string;

  @ApiProperty({ enum: INPUT_TYPES })
  @IsIn(INPUT_TYPES)
  inputType: (typeof INPUT_TYPES)[number];

  @ApiPropertyOptional({ example: 'ZARI_TYPE', description: 'category_types.code supplying the options' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  optionCategoryType?: string | null;

  @ApiPropertyOptional({ description: 'Only offer the children of this category' })
  @IsOptional()
  @IsNumber()
  optionParentId?: number | null;

  @ApiPropertyOptional({ enum: INPUT_STEPS, default: 'details' })
  @IsOptional()
  @IsIn(INPUT_STEPS)
  stepKey?: (typeof INPUT_STEPS)[number];

  @ApiPropertyOptional({ example: 'zari' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  sectionKey?: string;

  @ApiPropertyOptional({ example: 'Zari' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sectionLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVariantAttribute?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional({
    example: { min: 0, max: 100 },
    description: 'min, max, step, minLength, maxLength, maxItems, pattern, gteKey, requiredWhen, optionsRootOnly',
  })
  @IsOptional()
  @IsObject()
  validationRules?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { key: 'zari_work_present', op: 'truthy' },
    description: 'Conditional visibility. Ops: eq, neq, in, notIn, truthy, falsy; combine with all / any.',
  })
  @IsOptional()
  @IsObject()
  visibilityRule?: Record<string, unknown> | null;

  @ApiPropertyOptional({ example: 'm' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['m', 'in'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unitOptions?: string[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultValue?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  helpText?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryInputDto extends PartialType(CreateCategoryInputDto) {}
