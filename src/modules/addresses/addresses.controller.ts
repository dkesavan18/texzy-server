import {
  Body,
  Controller,
  Delete,
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
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@ApiTags('addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's saved delivery addresses (max 3)" })
  findAll(@CurrentUser() user: AuthUser) {
    return this.addressesService.findAllMine(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Save a new delivery address (max 3 per user)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one of your saved addresses' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.userId, id, dto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Mark one of your saved addresses as the default' })
  setDefault(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.addressesService.setDefault(user.userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one of your saved addresses' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.addressesService.remove(user.userId, id);
  }
}
