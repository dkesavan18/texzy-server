import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BuyNowDto } from './dto/buy-now.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('buy-now')
  @ApiOperation({
    summary:
      'Product Detail -> Buy Now: validates the product server-side, creates the Texzy order + item, and creates the matching Razorpay order',
  })
  buyNow(@CurrentUser() user: AuthUser, @Body() dto: BuyNowDto) {
    return this.ordersService.buyNow(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the current user's own orders" })
  findAll(@CurrentUser() user: AuthUser) {
    return this.ordersService.findAllByUser(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of the current user\'s own orders by id' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.findOneMine(user.userId, id);
  }
}
