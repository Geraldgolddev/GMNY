import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const globalPrefix = config.get<string>('app.globalPrefix') ?? 'api';
  app.setGlobalPrefix(globalPrefix);

  app.use(helmet());
  app.use(cookieParser(config.get<string>('cookie.secret')));
  app.enableCors({
    origin: config.get<string[]>('app.corsOrigins'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  // OpenAPI / Swagger — every endpoint is documented.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GMNY API')
    .setDescription('USDC-powered cross-border payments — USD → USDC (Base) → NGN.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);

  const port = config.get<number>('app.port') ?? 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`GMNY API running on http://localhost:${port}/${globalPrefix}`);
  logger.log(`Swagger docs at http://localhost:${port}/${globalPrefix}/docs`);
}

void bootstrap();
