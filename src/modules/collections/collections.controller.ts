import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@ApiTags('collections')
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List active collections (public)' })
  findAll() {
    return this.collectionsService.findAll();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current user collections' })
  findAllMine(@CurrentUser() user: AuthUser) {
    return this.collectionsService.findAllByUser(user.userId);
  }

  @Get('mine/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get owned collection by id' })
  findOneMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collectionsService.findOneMine(user.userId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get active collection by id (public)' })
  findOne(@Param('id') id: string) {
    return this.collectionsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create collection' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update collection' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(user.userId, id, dto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish collection (visible to buyers)' })
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collectionsService.publish(user.userId, id);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate collection (visible to buyers)' })
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collectionsService.setActive(user.userId, id, true);
  }

  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate collection (hidden from buyers, kept in seller catalogue)',
  })
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collectionsService.setActive(user.userId, id, false);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete collection (sets inactive — same as deactivate)' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collectionsService.remove(user.userId, id);
  }
}
