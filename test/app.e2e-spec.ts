import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/bootstrap/configure-app';

describe('API response envelope (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health wraps success payload', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          success: true,
          error: null,
          data: expect.objectContaining({
            status: 'ok',
            database: 'connected',
          }),
        });
        expect(res.body).not.toHaveProperty('statusCode');
      });
  });

  it('GET /api/auth/me returns 401 with wrapped error and no statusCode in body', () => {
    return request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.data).toBeNull();
        expect(res.body.error).toBeTruthy();
        expect(res.body).not.toHaveProperty('statusCode');
      });
  });

  it('POST /api/auth/login returns 401 with wrapped error for invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'nobody@texzy.com', password: 'wrong-password-1' })
      .expect(401)
      .expect((res) => {
        expect(res.body).toEqual({
          success: false,
          error: expect.any(String),
          data: null,
        });
        expect(res.body).not.toHaveProperty('statusCode');
      });
  });

  it('POST /api/auth/register returns 400 with wrapped validation errors', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ accountType: 'customer', identifier: 'bad', password: 'short' })
      .expect(400)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.data).toBeNull();
        expect(res.body.error).toBeTruthy();
        expect(res.body).not.toHaveProperty('statusCode');
      });
  });
});
