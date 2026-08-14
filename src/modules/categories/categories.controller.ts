import {
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  CreateCategoryTypeDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('types')
  @ApiOperation({ summary: 'List category types' })
  findAllTypes() {
    return this.categoriesService.findAllTypes();
  }

  @Post('types')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category type' })
  createType(@Body() dto: CreateCategoryTypeDto) {
    return this.categoriesService.createType(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List categories',
    description:
      'Pass ?type=business to list business-type categories for registration (matches category_types.category_type).',
  })
  findAll(@Query('type') type?: string) {
    return this.categoriesService.findAll(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete category' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
