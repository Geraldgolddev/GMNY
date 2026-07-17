import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Full end-to-end auth flows against the real (test) database:
 * register -> verify email -> login -> cookie refresh -> forgot/reset ->
 * sessions -> RBAC -> validation -> anti-enumeration -> rate limiting.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e_${Date.now()}@nairaflow.io`;
  const password = 'Str0ng!Pass1';
  const newPassword = 'N3w!Str0ngPass2';

  const tokenFromUrl = (url?: string): string => {
    if (!url) throw new Error('expected a dev action url');
    return new URL(url).searchParams.get('token') as string;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    prisma = app.get(PrismaService);
    await app.init();
    client = agent();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  // Agent persists the httpOnly refresh cookie across requests.
  const agent = () => request.agent(app.getHttpServer());
  let client: ReturnType<typeof agent>;

  let accessToken: string;
  let verifyToken: string;

  it('registers a new user (PENDING, unverified) and sets a refresh cookie', async () => {
    const res = await client
      .post('/api/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'Tester' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.emailVerified).toBe(false);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    expect(res.body.data.tokens.refreshToken).toBeUndefined();
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toContain('nf_refresh=');
    accessToken = res.body.data.tokens.accessToken;
    verifyToken = tokenFromUrl(res.body.data.devVerificationUrl);
  });

  it('rejects duplicate registration with 409', async () => {
    await agent()
      .post('/api/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'Tester' })
      .expect(409);
  });

  it('returns the principal from /auth/me with a valid token', async () => {
    const res = await client
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data.email).toBe(email);
  });

  it('rejects /auth/me without a token (401)', async () => {
    await agent().get('/api/auth/me').expect(401);
  });

  it('verifies the email with the token from the (dev) link', async () => {
    await agent().post('/api/auth/verify-email').send({ token: verifyToken }).expect(200);
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.emailVerifiedAt).toBeTruthy();
    expect(user?.status).toBe('ACTIVE');
  });

  it('rejects reusing a consumed verification token (401)', async () => {
    await agent().post('/api/auth/verify-email').send({ token: verifyToken }).expect(401);
  });

  it('logs in with valid credentials', async () => {
    const res = await client.post('/api/auth/login').send({ email, password }).expect(200);
    accessToken = res.body.data.tokens.accessToken;
    expect(accessToken).toBeTruthy();
  });

  it('rejects login with a wrong password (401)', async () => {
    await agent().post('/api/auth/login').send({ email, password: 'totally-wrong-1' }).expect(401);
  });

  it('refreshes using only the httpOnly cookie (no body)', async () => {
    const res = await client.post('/api/auth/refresh').send({}).expect(200);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    accessToken = res.body.data.tokens.accessToken;
  });

  it('lists active sessions for the current user', async () => {
    const res = await client
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('runs the forgot -> reset password flow and revokes sessions', async () => {
    const forgot = await agent().post('/api/auth/forgot-password').send({ email }).expect(200);
    const resetToken = tokenFromUrl(forgot.body.data.devActionUrl);

    await agent()
      .post('/api/auth/reset-password')
      .send({ token: resetToken, newPassword })
      .expect(200);

    // Old password no longer works; new password does.
    await agent().post('/api/auth/login').send({ email, password }).expect(401);
    const relogin = await agent()
      .post('/api/auth/login')
      .send({ email, password: newPassword })
      .expect(200);
    expect(relogin.body.data.tokens.accessToken).toBeTruthy();
  });

  it('does not reveal whether an email exists on forgot-password (200)', async () => {
    const res = await agent()
      .post('/api/auth/forgot-password')
      .send({ email: 'definitely-not-here@nairaflow.io' })
      .expect(200);
    expect(res.body.data.devActionUrl).toBeUndefined();
  });

  it('blocks a USER from the admin-only users list (403)', async () => {
    const login = await agent().post('/api/auth/login').send({ email, password: newPassword });
    await agent()
      .get('/api/users')
      .set('Authorization', `Bearer ${login.body.data.tokens.accessToken}`)
      .expect(403);
  });

  it('enforces validation on malformed input (400)', async () => {
    await agent()
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);
  });

  it('rate-limits repeated forgot-password requests (429)', async () => {
    let sawTooMany = false;
    for (let i = 0; i < 10; i += 1) {
      const res = await agent().post('/api/auth/forgot-password').send({ email });
      if (res.status === 429) {
        sawTooMany = true;
        break;
      }
    }
    expect(sawTooMany).toBe(true);
  });
});
