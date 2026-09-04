import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RazorpayModule } from '../../common/payments/razorpay.module';
import {
  Order,
  OrderItem,
  OrderItemStatus,
  Payment,
  Product,
} from '../../database/entities';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    RazorpayModule,
    CartModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderItemStatus,
      Payment,
      Product,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [TypeOrmModule],
})
export class OrdersModule {}
