import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({ description: 'order_id returned by POST /orders/buy-now' })
  @IsString()
  razorpayOrderId: string;

  @ApiProperty({
    description: 'razorpay_payment_id from the Checkout success handler',
  })
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty({
    description: 'razorpay_signature from the Checkout success handler',
  })
  @IsString()
  razorpaySignature: string;
}
