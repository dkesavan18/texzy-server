import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RazorpayModule } from '../../common/payments/razorpay.module';
import { Order, OrderItem, Payment, Product } from '../../database/entities';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    RazorpayModule,
    TypeOrmModule.forFeature([Order, OrderItem, Payment, Product]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
