import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DealsService } from './deals.service';
import {
  CreateDealFromNeedResponseDto,
  CreateDealFromProductDto,
  RespondDealDto,
  UpdateDealStatusDto,
} from './dto/deal.dto';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @ApiOperation({ summary: 'List my bulk-order deals (as buyer and/or seller)' })
  @ApiQuery({ name: 'role', required: false, enum: ['buyer', 'seller'] })
  findMine(
    @CurrentUser() user: AuthUser,
    @Query('role') role?: 'buyer' | 'seller',
  ) {
    return this.dealsService.findMine(user.userId, role);
  }

  @Get(':id/quotation.pdf')
  @ApiOperation({ summary: 'Download bulk-order quotation PDF' })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadQuotation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.dealsService.downloadQuotationPdf(user.userId, id);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="texzy-bulk-order-${id}.pdf"`,
    );
    return file;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one bulk-order deal' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dealsService.findOneForUser(user.userId, id);
  }

  @Post('from-need-response')
  @ApiOperation({
    summary:
      'Start a Bulk Order from a request response (need owner → seller quote)',
  })
  createFromNeedResponse(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDealFromNeedResponseDto,
  ) {
    return this.dealsService.createFromNeedResponse(user.userId, dto);
  }

  @Post('from-product')
  @ApiOperation({
    summary: 'Start a Bulk Order for a product that allows bulk orders',
  })
  createFromProduct(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDealFromProductDto,
  ) {
    return this.dealsService.createFromProduct(user.userId, dto);
  }

  @Patch(':id/respond')
  @ApiOperation({
    summary: 'Seller/buyer updates quotation price, qty, notes, or status',
  })
  respond(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RespondDealDto,
  ) {
    return this.dealsService.respond(user.userId, id, dto);
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
