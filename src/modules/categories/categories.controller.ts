import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  CreateCategoryTypeDto,
  UpdateCategoryDto,
} from './dto/category.dto';
import { CategoryListResponseDto, CategoryOptionDto } from './dto/category-list.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('types')
  @ApiOperation({ summary: 'List category types (public)' })
  findAllTypes() {
    return this.categoriesService.findAllTypes();
  }

  @Post('types')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category type (admin only)' })
  createType(@Body() dto: CreateCategoryTypeDto) {
    return this.categoriesService.createType(dto);
  }

  @Get('list')
  @ApiOperation({
    summary: 'List all category types with their categories (public)',
    description:
      'Returns active category types, each with its active categories in one payload.',
  })
  findAllGrouped(): Promise<CategoryListResponseDto> {
    return this.categoriesService.findAllGrouped();
  }

  @Get('options')
  @ApiOperation({
    summary: 'List the dropdown options of one option set (public)',
    description:
      'type = category type code, e.g. COLOUR, MATERIAL, ZARI_TYPE, PRODUCT_CATEGORY. ' +
      'parentId returns only the children of one option; rootOnly=true returns only top-level options.',
  })
  @ApiQuery({ name: 'type', required: true, example: 'COLOUR' })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'rootOnly', required: false, type: Boolean })
  @ApiOkResponse({ type: [CategoryOptionDto] })
  findOptions(
    @Query('type') type?: string,
    @Query('parentId') parentId?: string,
    @Query('rootOnly') rootOnly?: string,
  ) {
    if (!type?.trim()) {
      throw new BadRequestException('type is required');
    }
    if (parentId !== undefined && !/^\d+$/.test(parentId)) {
      throw new BadRequestException('parentId must be a number');
    }
    return this.categoriesService.findOptions(type, {
      parentId,
      rootOnly: rootOnly === 'true',
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List categories (public)',
    description:
      'Pass ?type=business_type, business_category, business_mode, PRODUCT_CATEGORY, COLOUR, etc. ' +
      '(exact category type name or code, case-insensitive).',
  })
  findAll(@Query('type') type?: string) {
    return this.categoriesService.findAll(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id (public)' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (admin only)' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete category (admin only)' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
