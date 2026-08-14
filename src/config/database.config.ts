import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { entities } from '../database/entities';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const synchronize = configService.get<boolean>('database.synchronize', false);

  if (synchronize) {
    throw new Error(
      'DB_SYNCHRONIZE must be false. Tables already exist — NestJS must not create, drop, or alter schema.',
    );
  }

  return {
    type: 'postgres',
    host: configService.getOrThrow<string>('database.host'),
    port: configService.getOrThrow<number>('database.port'),
    username: configService.getOrThrow<string>('database.username'),
    password: configService.get<string>('database.password', ''),
    database: configService.getOrThrow<string>('database.name'),
    entities,
    synchronize: false,
    migrationsRun: false,
    dropSchema: false,
    logging: configService.get<boolean>('database.logging', false),
    autoLoadEntities: false,
  };
};
