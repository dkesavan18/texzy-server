import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RazorpayModule } from '../../common/payments/razorpay.module';
import {
  Order,
  OrderItem,
  Payment,
  Product,
  ProductVariant,
} from '../../database/entities';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    RazorpayModule,
    CartModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Payment,
      Product,
      ProductVariant,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
