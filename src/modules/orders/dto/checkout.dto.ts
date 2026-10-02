import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { ShippingAddressDto } from './shipping-address.dto';

/** Cart -> Checkout: buys every item currently in the caller's cart in one order. */
export class CheckoutDto {
  @ApiPropertyOptional({
    description: 'addresses.address_id — a saved delivery address. Provide this OR shippingAddress.',
  })
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiPropertyOptional({ type: ShippingAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;
}
