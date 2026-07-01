import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';

describe('Auth + RBAC + Sprints (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let adminToken = '';
  let viewerToken = '';
  let viewerUserId = '';

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    process.env.JWT_SECRET = 'e2e-secret';
    process.env.AUTH_STRICT_MODE = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('signs in admin and returns JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({
        email: 'mithunpramilak@etihad.ae',
        password: 'Admin@1234',
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('Admin');
    adminToken = res.body.token;
  });

  it('rejects non-etihad sign-in', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({
        email: 'someone@gmail.com',
        password: 'abc12345',
      })
      .expect(403);

    expect(res.body.error).toBeDefined();
  });

  it('creates viewer user and blocks viewer from admin sprint action', async () => {
    const signInRes = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({
        email: 'viewer1@etihad.ae',
        password: 'Viewer@123',
      })
      .expect(200);

    viewerToken = signInRes.body.token;
    viewerUserId = signInRes.body.user.id;

    await request(app.getHttpServer())
      .post('/api/sprints')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        sprint: '99.1',
        pi: 99,
        start: '2099-01-01',
        end: '2099-01-14',
      })
      .expect(403);
  });

  it('allows admin to create sprint and list sprints', async () => {
    await request(app.getHttpServer())
      .post('/api/sprints')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sprint: '99.1',
        pi: 99,
        start: '2099-01-01',
        end: '2099-01-14',
      })
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get('/api/sprints')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((s: any) => s.sprint === '99.1')).toBe(true);
  });

  it('promotes user to editor and still blocks editor from admin-only sprint create', async () => {
    await request(app.getHttpServer())
      .put(`/api/users/${viewerUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'Editor',
        isActive: true,
        assignedTeams: [],
      })
      .expect(200);

    const editorSignInRes = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({
        email: 'viewer1@etihad.ae',
        password: 'Viewer@123',
      })
      .expect(200);

    const editorToken = editorSignInRes.body.token;

    await request(app.getHttpServer())
      .post('/api/sprints')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        sprint: '99.2',
        pi: 99,
        start: '2099-01-15',
        end: '2099-01-28',
      })
      .expect(403);
  });
});
