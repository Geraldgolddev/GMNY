import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Full end-to-end auth flow against the real database configured via
 * DATABASE_URL (point this at the test database). Exercises register →
 * me → refresh → rotation-replay rejection → admin RBAC.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e_${Date.now()}@nairaflow.io`;
  const password = 'Str0ng!Pass1';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Filter + interceptor are already wired globally via AppModule providers.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  let accessToken: string;
  let refreshToken: string;

  it('registers a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'Tester' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    accessToken = res.body.data.tokens.accessToken;
    refreshToken = res.body.data.tokens.refreshToken;
  });

  it('rejects duplicate registration with 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'Tester' })
      .expect(409);
  });

  it('returns the principal from /auth/me with a valid token', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data.role).toBe('USER');
  });

  it('rejects /auth/me without a token (401)', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
  });

  it('rejects login with a wrong password (401)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'totally-wrong-123' })
      .expect(401);
  });

  it('rotates a refresh token and rejects replay of the old one', async () => {
    const first = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    const newRefresh = first.body.data.tokens.refreshToken;
    expect(newRefresh).toBeTruthy();

    // Replaying the now-revoked original token must fail.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('blocks a USER from the admin-only users list (403)', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('enforces validation on malformed input (400)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);
  });
});
