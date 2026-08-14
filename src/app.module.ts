import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { DealsModule } from './modules/deals/deals.module';
import { DevicesModule } from './modules/devices/devices.module';
import { HealthModule } from './modules/health/health.module';
import { NeedsModule } from './modules/needs/needs.module';
import { ProductsModule } from './modules/products/products.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { UsersModule } from './modules/users/users.module';
import { VerificationsModule } from './modules/verifications/verifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [configuration],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    VerificationsModule,
    DevicesModule,
    SessionsModule,
    CategoriesModule,
    ProductsModule,
    NeedsModule,
    CollectionsModule,
    ConversationsModule,
    DealsModule,
  ],
})
export class AppModule {}
