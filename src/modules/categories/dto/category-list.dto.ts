import { ApiProperty } from '@nestjs/swagger';

export class CategoryItemDto {
  @ApiProperty({ example: 1 })
  categoryId: number;

  @ApiProperty({ example: 'Manufacturer' })
  categoryName: string | null;
}

export class CategoryTypeGroupDto {
  @ApiProperty({ example: 1, description: 'category_types.category_type_id' })
  categoryTypeId: number;

  @ApiProperty({ example: 'business_type' })
  categoryType: string | null;

  @ApiProperty({ type: [CategoryItemDto] })
  categories: CategoryItemDto[];
}

export class CategoryListResponseDto {
  @ApiProperty({ type: [CategoryTypeGroupDto] })
  items: CategoryTypeGroupDto[];
}
