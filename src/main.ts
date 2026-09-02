import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';
import { ApiResponseDto } from './common/dto/api-response.dto';

async function bootstrap() {
  // rawBody is required to verify the Razorpay webhook's X-Razorpay-Signature header,
  // which is computed over the exact raw request bytes (not the parsed/re-serialized JSON).
  const app = await NestFactory.create(AppModule, { rawBody: true });

  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Texzy API')
    .setDescription(
      'Texzy backend API — NestJS + PostgreSQL\n\n' +
        'All endpoints return a standard envelope:\n' +
        '- Success: `{ success: true, error: null, data: <payload> }`\n' +
        '- Error: `{ success: false, error: <message>, data: null }`\n\n' +
        'HTTP status codes (401, 404, etc.) are sent only as response status — never inside the JSON body.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [ApiResponseDto],
  });
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);

  await app.listen(port);
  console.log(`Texzy server running on http://localhost:${port}/api`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

void bootstrap();
