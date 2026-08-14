import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deal, DealStatus } from '../../database/entities';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deal, DealStatus])],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService, TypeOrmModule],
})
export class DealsModule {}
