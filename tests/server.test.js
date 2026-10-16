const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server/server');
const config = require('../server/config/env');

describe('Server & Health Check Endpoints', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('GET /health returns 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('SmartResolve AI is running');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/nonexistent returns 404 with standard error format', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
