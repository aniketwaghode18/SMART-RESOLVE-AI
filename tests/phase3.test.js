const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server/server');
const config = require('../server/config/env');
const User = require('../server/models/User');
const Order = require('../server/models/Order');
const Policy = require('../server/models/Policy');
const Conversation = require('../server/models/Conversation');
const Escalation = require('../server/models/Escalation');

describe('Phase 3 — Remaining Backend APIs', () => {
  let customerToken = '';
  let agentToken = '';
  let adminToken = '';
  let customerId = '';
  let testOrderId = '';
  let testConvId = '';
  let testCaseId = '';
  let testPolicyId = 'test_return_policy';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    // 1. Login seeded customer
    const custRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul@example.com', password: 'password123' });
    customerToken = custRes.body.token;
    customerId = custRes.body.user?.id || custRes.body.user?._id;

    // 2. Login seeded agent
    const agentRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'priya@smartresolve.ai', password: 'password123' });
    agentToken = agentRes.body.token;

    // 3. Login seeded admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@smartresolve.ai', password: 'password123' });
    adminToken = adminRes.body.token;

    // 4. Create an order for testing
    testOrderId = `TEST-ORD-${Date.now()}`;
    await Order.create({
      orderId: testOrderId,
      customerId,
      productId: 'PROD-001',
      productName: 'Noise Cancelling Headphones',
      quantity: 1,
      orderDate: new Date(),
      status: 'PROCESSING',
      paymentMethod: 'upi',
      totalAmount: 4999
    });

    // 5. Create a conversation for testing
    testConvId = `conv_test_${Date.now()}`;
    await Conversation.create({
      conversationId: testConvId,
      customerId,
      status: 'active',
      subject: 'Order tracking question'
    });

    // 6. Create an escalation for testing
    testCaseId = `CASE_TEST_${Date.now()}`;
    await Escalation.create({
      caseId: testCaseId,
      conversationId: testConvId,
      customerId,
      priority: 'HIGH',
      department: 'SUPPORT',
      reason: 'Urgent customer issue',
      status: 'open'
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await Order.deleteMany({ orderId: { $regex: /^TEST-ORD-/ } });
    await Conversation.deleteMany({ conversationId: { $regex: /^conv_test_/ } });
    await Escalation.deleteMany({ caseId: { $regex: /^CASE_TEST_/ } });
    await Policy.deleteMany({ policyId: testPolicyId });
    await mongoose.connection.close();
  });

  // ─── 1. Order APIs ────────────────────────────────────────────────────────
  describe('Order APIs (/api/orders)', () => {
    it('GET /api/orders returns customer orders for authenticated customer', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.orders)).toBe(true);
      expect(res.body.orders.length).toBeGreaterThan(0);
    });

    it('GET /api/orders/:orderId returns single order detail', async () => {
      const res = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.orderId).toBe(testOrderId);
    });

    it('PATCH /api/orders/:orderId/status updates status when called by agent', async () => {
      const res = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'SHIPPED' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.status).toBe('SHIPPED');
    });

    it('PATCH /api/orders/:orderId/status is forbidden for customers', async () => {
      const res = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'CANCELLED' });

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── 2. Conversation APIs ──────────────────────────────────────────────────
  describe('Conversation APIs (/api/conversations)', () => {
    it('GET /api/conversations returns conversations list', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.conversations)).toBe(true);
    });

    it('GET /api/conversations/:id returns conversation details', async () => {
      const res = await request(app)
        .get(`/api/conversations/${testConvId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conversation.conversationId).toBe(testConvId);
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    it('PATCH /api/conversations/:id/status updates status (agent only)', async () => {
      const res = await request(app)
        .patch(`/api/conversations/${testConvId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'resolved' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conversation.status).toBe('resolved');
    });

    it('POST /api/conversations/:id/messages adds a manual message', async () => {
      const res = await request(app)
        .post(`/api/conversations/${testConvId}/messages`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ message: 'Thank you for your assistance.' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message.message).toBe('Thank you for your assistance.');
    });
  });

  // ─── 3. Policy APIs ────────────────────────────────────────────────────────
  describe('Policy APIs (/api/policies)', () => {
    it('GET /api/policies returns list of policies', async () => {
      const res = await request(app).get('/api/policies');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.policies)).toBe(true);
      expect(res.body.policies.length).toBeGreaterThan(0);
    });

    it('POST /api/policies allows admin to create new policy', async () => {
      const res = await request(app)
        .post('/api/policies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          policyId: testPolicyId,
          title: 'Special Holiday Return Policy',
          category: 'return',
          content: 'Items purchased in December have extended 45-day returns.',
          keywords: ['holiday', 'december', 'extended return']
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.policy.policyId).toBe(testPolicyId);
    });

    it('PUT /api/policies/:id allows admin to update policy', async () => {
      const res = await request(app)
        .put(`/api/policies/${testPolicyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Special Holiday Return Policy 2026' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.policy.title).toBe('Special Holiday Return Policy 2026');
    });

    it('DELETE /api/policies/:id allows admin to delete policy', async () => {
      const res = await request(app)
        .delete(`/api/policies/${testPolicyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── 4. Escalation APIs ───────────────────────────────────────────────────
  describe('Escalation APIs (/api/escalations)', () => {
    it('GET /api/escalations returns escalated cases for agents', async () => {
      const res = await request(app)
        .get('/api/escalations')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.escalations)).toBe(true);
    });

    it('GET /api/escalations/:id returns single case detail', async () => {
      const res = await request(app)
        .get(`/api/escalations/${testCaseId}`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.escalation.caseId).toBe(testCaseId);
    });

    it('PATCH /api/escalations/:id updates status and resolution', async () => {
      const res = await request(app)
        .patch(`/api/escalations/${testCaseId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: 'resolved',
          agentNotes: 'Contacted customer and issued replacement tracking link.',
          resolution: 'REPLACEMENT'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.escalation.status).toBe('resolved');
      expect(res.body.escalation.resolvedAt).toBeDefined();
    });
  });

  // ─── 5. Analytics APIs ────────────────────────────────────────────────────
  describe('Analytics APIs (/api/analytics)', () => {
    it('GET /api/analytics returns all 7 metric categories for agents', async () => {
      const res = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.overview).toBeDefined();
      expect(res.body.overview.totalConversations).toBeGreaterThanOrEqual(0);
      expect(res.body.overview.autoResolutionRate).toBeDefined();
      expect(res.body.overview.avgConfidence).toBeDefined();
      expect(Array.isArray(res.body.intentDistribution)).toBe(true);
      expect(Array.isArray(res.body.sentimentDistribution)).toBe(true);
      expect(Array.isArray(res.body.urgencyDistribution)).toBe(true);
      expect(Array.isArray(res.body.dailyVolume)).toBe(true);
      expect(res.body.escalationMetrics).toBeDefined();
      expect(res.body.promptPerformance).toBeDefined();
    });

    it('GET /api/analytics rejects unauthorized customer requests', async () => {
      const res = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── 6. Evaluation APIs ───────────────────────────────────────────────────
  describe('Evaluation APIs (/api/evaluation)', () => {
    it('GET /api/evaluation/test-cases returns benchmark test dataset', async () => {
      const res = await request(app)
        .get('/api/evaluation/test-cases')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBeGreaterThan(0);
      expect(Array.isArray(res.body.testCases)).toBe(true);
    });

    it('POST /api/evaluation/run executes benchmark and returns report', async () => {
      const res = await request(app)
        .post('/api/evaluation/run')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ sampleSize: 3 }); // Test with sample size 3 for speedy verification

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report).toBeDefined();
      expect(res.body.report.metrics).toBeDefined();
      expect(res.body.report.metrics.intentAccuracy).toBeDefined();
      expect(res.body.report.metrics.avgLatencyPerCase).toBeDefined();
      expect(Array.isArray(res.body.report.results)).toBe(true);
    });

    it('GET /api/evaluation/history returns prior evaluation runs', async () => {
      const res = await request(app)
        .get('/api/evaluation/history')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.history)).toBe(true);
      expect(res.body.history.length).toBeGreaterThan(0);
    });

    it('GET /api/evaluation/versions returns prompt versions list', async () => {
      const res = await request(app)
        .get('/api/evaluation/versions')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.versions)).toBe(true);
    });
  });
});
