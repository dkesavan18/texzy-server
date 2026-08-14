import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Need,
  NeedMedia,
  NeedResponse,
  NeedTag,
  NeedTagsMapping,
  ResponseMedia,
} from '../../database/entities';
import { NeedsController } from './needs.controller';
import { NeedsService } from './needs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Need,
      NeedMedia,
      NeedResponse,
      ResponseMedia,
      NeedTag,
      NeedTagsMapping,
    ]),
  ],
  controllers: [NeedsController],
  providers: [NeedsService],
  exports: [NeedsService, TypeOrmModule],
})
export class NeedsModule {}
