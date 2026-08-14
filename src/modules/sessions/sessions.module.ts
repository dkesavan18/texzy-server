import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSession } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([UserSession])],
  exports: [TypeOrmModule],
})
export class SessionsModule {}
