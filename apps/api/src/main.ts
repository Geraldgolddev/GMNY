import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());

  const docs = new DocumentBuilder()
    .setTitle('GMNY API')
    .setDescription(
      'USDC-powered U.S.→Nigeria cross-border payments. Feature 1: Authentication.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('health')
    .addTag('auth')
    .addTag('dashboard')
    .addTag('recipients')
    .addTag('rates')
    .addTag('transfers')
    .addTag('history')
    .addTag('wallets')
    .addTag('base')
    .addTag('notifications')
    .addTag('admin')
    .addTag('webhooks')
    .build();




  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, docs));

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  logger.log(`GMNY API http://localhost:${port}/api/v1`);
  logger.log(`Swagger   http://localhost:${port}/docs`);
}

void bootstrap();

