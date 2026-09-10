import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category, Collection } from '../../database/entities';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';

@Module({
  imports: [TypeOrmModule.forFeature([Collection, Category])],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService, TypeOrmModule],
})
export class CollectionsModule {}
