import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RazorpayModule } from '../../common/payments/razorpay.module';
import { Order, OrderItem, Payment, Product } from '../../database/entities';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    RazorpayModule,
    TypeOrmModule.forFeature([Order, OrderItem, Payment, Product]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [TypeOrmModule],
})
export class OrdersModule {}
