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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CategoryInputsService } from './category-inputs.service';
import {
  CreateCategoryInputDto,
  UpdateCategoryInputDto,
} from './dto/category-input.dto';

@ApiTags('category-inputs')
@Controller('category-inputs')
export class CategoryInputsController {
  constructor(private readonly categoryInputsService: CategoryInputsService) {}

  @Get('config')
  @ApiOperation({
    summary: 'Resolved dynamic product form for a product category (public)',
    description:
      'Merges the global, product-group and product-type inputs for the given product category and ' +
      'returns the fields (ordered, with conditional-visibility and validation rules) plus the option sets they use.',
  })
  @ApiQuery({ name: 'categoryId', required: true })
  getConfig(@Query('categoryId') categoryId?: string) {
    if (!categoryId) throw new BadRequestException('categoryId is required');
    return this.categoryInputsService.resolveConfig(categoryId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List raw input mappings (admin only)' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'A category id, or "global" for fields that apply to every product',
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  list(
    @Query('categoryId') categoryId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.categoryInputsService.list({
      categoryId,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one input mapping (admin only)' })
  findOne(@Param('id') id: string) {
    return this.categoryInputsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an input mapping (admin only)' })
  create(@Body() dto: CreateCategoryInputDto) {
    return this.categoryInputsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an input mapping (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryInputDto) {
    return this.categoryInputsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate an input mapping (admin only)' })
  remove(@Param('id') id: string) {
    return this.categoryInputsService.remove(id);
  }
}
