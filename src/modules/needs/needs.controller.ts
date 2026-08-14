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
import { CreateNeedDto, UpdateNeedDto } from './dto/need.dto';
import { NeedsService } from './needs.service';

@ApiTags('needs')
@Controller('needs')
export class NeedsController {
  constructor(private readonly needsService: NeedsService) {}

  @Get()
  @ApiOperation({ summary: 'List active needs' })
  findAll() {
    return this.needsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get need by id' })
  findOne(@Param('id') id: string) {
    return this.needsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create need' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateNeedDto) {
    return this.needsService.create(user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update need' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateNeedDto,
  ) {
    return this.needsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete need' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.needsService.remove(user.userId, id);
  }
}
