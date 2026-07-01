import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';

describe('Submissions RBAC + native service (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let adminToken = '';
  let viewerToken = '';
  let editorToken = '';
  let viewerUserId = '';

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    process.env.JWT_SECRET = 'e2e-secret-submissions';
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

    const adminSignIn = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({ email: 'mithunpramilak@etihad.ae', password: 'Admin@1234' })
      .expect(200);
    adminToken = adminSignIn.body.token;

    const viewerSignIn = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({ email: 'submission-viewer@etihad.ae', password: 'Viewer@123' })
      .expect(200);
    viewerToken = viewerSignIn.body.token;
    viewerUserId = viewerSignIn.body.user.id;

    // Seed default teams (including MC) used by user assignment validation.
    await request(app.getHttpServer())
      .get('/api/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/users/${viewerUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'Editor', isActive: true, assignedTeams: ['MC'] })
      .expect(200);

    const editorSignIn = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({ email: 'submission-viewer@etihad.ae', password: 'Viewer@123' })
      .expect(200);
    editorToken = editorSignIn.body.token;

    await request(app.getHttpServer())
      .post('/api/sprints')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sprint: '2099.1',
        pi: 2099,
        start: '2099-01-01',
        end: '2099-01-14',
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('allows editor to upsert submission for assigned team', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/submissions/upsert')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        Team: 'McLaren',
        ProjectKey: 'MC',
        SprintNo: '2099.1',
        ProductHealth: 90,
        Objectives: ['Objective A'],
        Roster: [],
      })
      .expect(201);

    expect(res.body.isReplace).toBe(false);
  });

  it('blocks editor submission upsert for unassigned team', async () => {
    await request(app.getHttpServer())
      .post('/api/submissions/upsert')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        Team: 'Other',
        ProjectKey: 'CAD',
        SprintNo: '2099.1',
        ProductHealth: 80,
        Objectives: ['Objective B'],
      })
      .expect(403);
  });

  it('blocks viewer submission upsert', async () => {
    await request(app.getHttpServer())
      .post('/api/submissions/upsert')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        Team: 'McLaren',
        ProjectKey: 'MC',
        SprintNo: '2099.1',
      })
      .expect(403);
  });

  it('returns submission enriched with sprint window fields from native service', async () => {
    const getRes = await request(app.getHttpServer())
      .get('/api/submissions/MC/2099.1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(getRes.body.ProjectKey).toBe('MC');
    expect(getRes.body.SprintNo).toBe('2099.1');
    expect(getRes.body.SprintStart).toBe('2099-01-01');
    expect(getRes.body.SprintEnd).toBe('2099-01-14');
  });
});
