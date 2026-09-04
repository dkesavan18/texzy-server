import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { OrderItemStatusValue } from './constants/order-status.constant';
import { BuyNowDto } from './dto/buy-now.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';
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

  @Post('checkout')
  @ApiOperation({
    summary:
      "Cart -> Checkout: buys every item in the caller's cart, creates one order + the matching Razorpay order, then clears the cart",
  })
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user.userId, dto);
  }

  @Get('seller/items')
  @ApiOperation({
    summary:
      "Seller 'Orders received' — order items across all paid orders where the caller owns the product, optionally filtered by fulfillment status",
  })
  @ApiQuery({ name: 'status', required: false })
  findSellerItems(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: OrderItemStatusValue,
  ) {
    return this.ordersService.findSellerItems(user.userId, status);
  }

  @Get('seller/items/:id')
  @ApiOperation({ summary: 'Seller — get one of their own order items by id' })
  findSellerItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.findSellerItem(user.userId, id);
  }

  @Patch('seller/items/:id/status')
  @ApiOperation({
    summary:
      'Seller updates fulfillment status (packed/shipped/out_for_delivery/delivered/cancelled). A delivery photo is required to mark an item delivered.',
  })
  updateItemStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderItemStatusDto,
  ) {
    return this.ordersService.updateItemStatus(user.userId, id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the current user's own orders" })
  findAll(@CurrentUser() user: AuthUser) {
    return this.ordersService.findAllByUser(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get one of the current user's own orders by id" })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.findOneMine(user.userId, id);
  }
}
