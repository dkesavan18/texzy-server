import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryItemDto {
  @ApiProperty({ example: 1 })
  categoryId: number;

  @ApiProperty({ example: 'Manufacturer' })
  categoryName: string | null;

  @ApiProperty({ example: 'KANCHIPURAM_SILK_SAREE', nullable: true })
  code: string | null;

  @ApiPropertyOptional({ example: 60, nullable: true, description: 'Parent category id' })
  parentId: number | null;

  @ApiProperty({ example: 10 })
  displayOrder: number;

  @ApiPropertyOptional({ example: { hex: 'E0218A' }, nullable: true })
  metadata: Record<string, unknown> | null;
}

export class CategoryTypeGroupDto {
  @ApiProperty({ example: 1, description: 'category_types.category_type_id' })
  categoryTypeId: number;

  @ApiProperty({ example: 'business_type' })
  categoryType: string | null;

  @ApiProperty({ example: 'BUSINESS_TYPE', nullable: true })
  code: string | null;

  @ApiProperty({ type: [CategoryItemDto] })
  categories: CategoryItemDto[];
}

export class CategoryListResponseDto {
  @ApiProperty({ type: [CategoryTypeGroupDto] })
  items: CategoryTypeGroupDto[];
}

export class CategoryOptionDto {
  @ApiProperty({ example: 61 })
  categoryId: number;

  @ApiProperty({ example: 'RANI_PINK' })
  code: string | null;

  @ApiProperty({ example: 'Rani Pink' })
  name: string | null;

  @ApiProperty({ nullable: true, example: 5 })
  parentId: number | null;

  @ApiProperty({ example: 10 })
  displayOrder: number;

  @ApiProperty({ nullable: true, example: 'E0218A', description: 'Colour options only' })
  hex: string | null;
}
