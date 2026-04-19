'use strict';

/**
 * Integration tests for Auth and Task API endpoints.
 * Run with: npm test
 * Uses mongodb-memory-server — no external MongoDB required.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Task = require('../src/models/task.model');

// ── Test setup ────────────────────────────────────────────────────────────────
const TEST_USER = {
  name: 'Test User',
  email: 'test@neuralq.dev',
  password: 'TestPass123',
};

let authToken = '';
let createdTaskId = '';
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  // Clean test data
  await User.deleteMany({ email: TEST_USER.email });
  await Task.deleteMany({});
}, 30000);

afterAll(async () => {
  await User.deleteMany({ email: TEST_USER.email });
  await Task.deleteMany({});
  await mongoose.connection.close();
  await mongod.stop();
}, 30000);

// ── Auth Tests ────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('should register a new user and return token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(TEST_USER)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(TEST_USER.email);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(TEST_USER)
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it('should reject weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad', email: 'bad@test.com', password: 'weak' })
      .expect(422);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  it('should login and return token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);

    expect(res.body.success).toBe(true);
    authToken = res.body.data.token;
    expect(authToken).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'WrongPass123' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('should reject unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@test.com', password: 'TestPass123' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  it('should return current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data.user.email).toBe(TEST_USER.email);
  });

  it('should reject request without token', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });
});

// ── Task Tests ────────────────────────────────────────────────────────────────
describe('POST /api/tasks', () => {
  it('should create a task with valid data', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test Task', inputText: 'Hello World', operation: 'uppercase' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.task.status).toBe('pending');
    expect(res.body.data.task.operation).toBe('uppercase');
    createdTaskId = res.body.data.task._id;
  });

  it('should reject invalid operation type', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Bad Task', inputText: 'text', operation: 'invalid_op' })
      .expect(422);

    expect(res.body.success).toBe(false);
  });

  it('should reject task without authentication', async () => {
    await request(app)
      .post('/api/tasks')
      .send({ title: 'Unauth Task', inputText: 'text', operation: 'lowercase' })
      .expect(401);
  });
});

describe('GET /api/tasks', () => {
  it('should return paginated task list', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  it('should filter tasks by status', async () => {
    const res = await request(app)
      .get('/api/tasks?status=pending')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    res.body.data.forEach((t) => expect(t.status).toBe('pending'));
  });
});

describe('GET /api/tasks/stats', () => {
  it('should return task statistics', async () => {
    const res = await request(app)
      .get('/api/tasks/stats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data.stats).toBeDefined();
    expect(typeof res.body.data.stats.total).toBe('number');
    expect(typeof res.body.data.stats.pending).toBe('number');
  });
});

describe('GET /api/tasks/:id', () => {
  it('should return a single task by ID', async () => {
    const res = await request(app)
      .get(`/api/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data.task._id).toBe(createdTaskId);
  });

  it('should return 400 for invalid ObjectId', async () => {
    await request(app)
      .get('/api/tasks/invalid-id')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('should delete an existing task', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return 404 for already-deleted task', async () => {
    await request(app)
      .delete(`/api/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});

describe('GET /health', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBeDefined();
    expect(res.body.services).toBeDefined();
  });

  it('should return liveness probe', async () => {
    const res = await request(app).get('/health/live').expect(200);
    expect(res.body.alive).toBe(true);
  });
});
