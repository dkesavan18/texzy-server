import {
  Body,
  Controller,
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
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealStatusDto } from './dto/deal.dto';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @ApiOperation({ summary: 'List my deals' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.dealsService.findMine(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal by id' })
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create deal' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDealDto) {
    return this.dealsService.create(user.userId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update deal status' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDealStatusDto,
  ) {
    return this.dealsService.updateStatus(user.userId, id, dto);
  }
}
