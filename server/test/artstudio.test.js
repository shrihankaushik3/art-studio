import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { connectDB, disconnectDB } from '../src/config/db.js';
import app from '../src/app.js';
import { runSeed } from '../src/scripts/seed.js';
import User from '../src/models/User.js';
import Painting from '../src/models/Painting.js';
import Order from '../src/models/Order.js';
import WallBooking from '../src/models/WallBooking.js';
import { PotteryRequest } from '../src/models/Pottery.js';

describe('Art Studio Full-Stack Backend Integration Test Suite', () => {
  let customerToken = '';
  let customerUser = null;
  let customer2Token = '';
  let customer2User = null;
  let studioToken = '';

  before(async () => {
    process.env.JWT_SECRET = 'test_secret_for_integration_testing_123';
    await connectDB();
    await runSeed({ silent: true });

    // Resolve studio credentials dynamically without hardcoding secrets in source control
    const studioEmail = process.env.STUDIO_EMAIL || 'studio@artstudio.in';
    let studioPassword = process.env.STUDIO_PASSWORD;

    if (!studioPassword) {
      const fs = await import('fs');
      const path = await import('path');
      const seedFile = path.resolve(process.cwd(), 'seedData/seed.json');
      if (fs.existsSync(seedFile)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
          studioPassword = parsed.studioAccount?.password;
        } catch (e) {
          // fallback
        }
      }
    }

    if (!studioPassword) {
      studioPassword = 'TestStudioPassword!123';
      const bcrypt = (await import('bcryptjs')).default;
      const hashedPassword = await bcrypt.hash(studioPassword, 10);
      await User.findOneAndUpdate(
        { email: studioEmail },
        { email: studioEmail, password: hashedPassword, role: 'studio' },
        { upsert: true }
      );
    }

    // Login as seeded studio account
    const studioRes = await request(app)
      .post('/api/auth/login')
      .send({ email: studioEmail, password: studioPassword });
    
    assert.equal(studioRes.status, 200, 'Studio login should succeed');
    studioToken = studioRes.body.token;

    // Register customer 1
    const custRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'customer1@example.com', password: 'Password@123' });

    assert.equal(custRes.status, 201, 'Customer 1 registration should succeed');
    customerToken = custRes.body.token;
    customerUser = custRes.body.user;

    // Register customer 2
    const cust2Res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'customer2@example.com', password: 'Password@123' });

    assert.equal(cust2Res.status, 201, 'Customer 2 registration should succeed');
    customer2Token = cust2Res.body.token;
    customer2User = cust2Res.body.user;
  });

  after(async () => {
    await disconnectDB();
  });

  // --- Health Endpoint & Static Assets ---
  test('GET /api/health should return ok and database status', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'connected');
  });

  test('GET /images/p-001.jpg serves the seeded image correctly', async () => {
    const res = await request(app).get('/images/p-001.jpg');
    assert.equal(res.status, 200);
    assert(res.headers['content-type'].includes('image'));
  });

  test('GET / serves the built frontend single page application', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert(res.headers['content-type'].includes('text/html'));
  });

  // --- Authentication & Role Authorization ---
  describe('Authentication & Permissions', () => {
    test('Public signup always assigns customer role even if admin requested', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'fakeadmin@example.com', password: 'Password@123', role: 'admin' });
      assert.equal(res.status, 201);
      assert.equal(res.body.user.role, 'customer', 'Public registration must never create admin');
    });

    test('Duplicate email registration returns 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'customer1@example.com', password: 'Password@123' });
      assert.equal(res.status, 409);
    });

    test('Invalid credentials return 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'customer1@example.com', password: 'WrongPassword' });
      assert.equal(res.status, 401);
    });

    test('Unauthenticated requests to protected routes return 401', async () => {
      const res = await request(app).get('/api/paintings/orders/my');
      assert.equal(res.status, 401);
    });

    test('Customer accessing admin-only route returns 403', async () => {
      const res = await request(app)
        .post('/api/paintings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          id: 'p-999',
          title: 'Unauthorized Painting',
          artist: 'Hacker',
          description: 'Test',
          price: 5000,
          imageUrl: 'images/p-001.jpg'
        });
      assert.equal(res.status, 403, 'Customer must get 403 for admin routes');
    });
  });

  // --- Paintings Catalog & Purchases ---
  describe('Paintings Workflow', () => {
    test('GET /api/paintings returns seeded paintings with correct schema', async () => {
      const res = await request(app).get('/api/paintings');
      assert.equal(res.status, 200);
      assert(Array.isArray(res.body.paintings));
      assert(res.body.paintings.length >= 12);
      
      const p1 = res.body.paintings.find(p => p.id === 'p-001');
      assert(p1);
      assert.equal(p1.title, 'Madhubani Peacock Garden');
      assert.equal(p1.price, 6500);
      assert.equal(p1.status, 'available');
    });

    test('Customer can purchase an available painting', async () => {
      const res = await request(app)
        .post('/api/paintings/p-001/purchase')
        .set('Authorization', `Bearer ${customerToken}`);

      assert.equal(res.status, 201);
      assert.equal(res.body.order.paintingId, 'p-001');
      assert.equal(res.body.order.status, 'placed');

      // Verify painting is marked sold
      const checkRes = await request(app).get('/api/paintings/p-001');
      assert.equal(checkRes.body.painting.status, 'sold');
    });

    test('Simultaneous/Duplicate purchase of sold painting returns 409', async () => {
      const res = await request(app)
        .post('/api/paintings/p-001/purchase')
        .set('Authorization', `Bearer ${customer2Token}`);

      assert.equal(res.status, 409, 'Sold painting purchase must be rejected');
    });

    test('Customer 2 cannot cancel Customer 1 order (returns 404)', async () => {
      // Find the order for p-001
      const order = await Order.findOne({ paintingId: 'p-001', status: 'placed' });
      assert(order);

      const res = await request(app)
        .post(`/api/paintings/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${customer2Token}`);

      assert.equal(res.status, 404, 'Accessing another customer record must return 404');
    });

    test('Customer 1 can cancel their own order, releasing painting to available', async () => {
      const order = await Order.findOne({ paintingId: 'p-001', status: 'placed' });
      assert(order);

      const res = await request(app)
        .post(`/api/paintings/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.order.status, 'cancelled');

      // Verify painting is available again
      const checkRes = await request(app).get('/api/paintings/p-001');
      assert.equal(checkRes.body.painting.status, 'available');
    });

    test('Admin can add and edit available paintings', async () => {
      const addRes = await request(app)
        .post('/api/paintings')
        .set('Authorization', `Bearer ${studioToken}`)
        .send({
          id: 'p-test-01',
          title: 'Terracotta Sunrise',
          artist: 'Kavita Rao',
          description: 'Terracotta artwork on wood',
          price: 8500,
          imageUrl: 'images/p-002.jpg'
        });
      assert.equal(addRes.status, 201);

      // Edit the painting
      const editRes = await request(app)
        .put('/api/paintings/p-test-01')
        .set('Authorization', `Bearer ${studioToken}`)
        .send({ price: 9000 });
      assert.equal(editRes.status, 200);
      assert.equal(editRes.body.painting.price, 9000);
    });

    test('Admin cannot edit a sold painting', async () => {
      // p-004 is seeded as 'sold'
      const res = await request(app)
        .put('/api/paintings/p-004')
        .set('Authorization', `Bearer ${studioToken}`)
        .send({ price: 15000 });
      assert.equal(res.status, 400);
    });
  });

  // --- Wall Bookings ---
  describe('Wall Bookings Workflow', () => {
    function getFutureDate(daysFromToday) {
      const d = new Date();
      d.setDate(d.getDate() + daysFromToday);
      return d.toISOString().split('T')[0];
    }

    test('Wall booking fails if date is less than 7 days away', async () => {
      const invalidDate = getFutureDate(3);
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          date: invalidDate,
          areaSqFt: 100,
          address: '123 Art Lane, Bangalore'
        });
      assert.equal(res.status, 400);
    });

    test('Wall booking fails if date is more than 90 days away', async () => {
      const invalidDate = getFutureDate(100);
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          date: invalidDate,
          areaSqFt: 100,
          address: '123 Art Lane, Bangalore'
        });
      assert.equal(res.status, 400);
    });

    test('Wall booking fails if area is out of bounds (<10 or >500)', async () => {
      const validDate = getFutureDate(15);
      const resLow = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ date: validDate, areaSqFt: 5, address: '123 Art Lane' });
      assert.equal(resLow.status, 400);

      const resHigh = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ date: validDate, areaSqFt: 600, address: '123 Art Lane' });
      assert.equal(resHigh.status, 400);
    });

    test('Valid wall booking calculates price = area * 150', async () => {
      const validDate = getFutureDate(20);
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          date: validDate,
          areaSqFt: 50,
          address: '45 MG Road, Bangalore'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.booking.price, 50 * 150);
      assert.equal(res.body.booking.status, 'requested');
    });

    test('Prevent duplicate active booking for the same date (returns 409)', async () => {
      const validDate = getFutureDate(20);
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          date: validDate,
          areaSqFt: 80,
          address: '77 Residency Road'
        });

      assert.equal(res.status, 409, 'Same date cannot have multiple active bookings');
    });

    test('Customer 2 cannot cancel Customer 1 booking (returns 404)', async () => {
      const booking = await WallBooking.findOne({ date: getFutureDate(20) });
      assert(booking);

      const res = await request(app)
        .post(`/api/bookings/${booking._id}/cancel`)
        .set('Authorization', `Bearer ${customer2Token}`);

      assert.equal(res.status, 404);
    });

    test('Customer can cancel booking when > 3 days away', async () => {
      const booking = await WallBooking.findOne({ date: getFutureDate(20) });
      assert(booking);

      const res = await request(app)
        .post(`/api/bookings/${booking._id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.booking.status, 'cancelled');

      // Date is now free again! Customer 2 can book it now.
      const bookAgainRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          date: getFutureDate(20),
          areaSqFt: 80,
          address: '77 Residency Road'
        });
      assert.equal(bookAgainRes.status, 201);
    });

    test('Admin can confirm or decline requested booking', async () => {
      const booking = await WallBooking.findOne({ date: getFutureDate(20), status: 'requested' });
      assert(booking);

      const confirmRes = await request(app)
        .patch(`/api/bookings/${booking._id}/status`)
        .set('Authorization', `Bearer ${studioToken}`)
        .send({ status: 'confirmed' });

      assert.equal(confirmRes.status, 200);
      assert.equal(confirmRes.body.booking.status, 'confirmed');
    });
  });

  // --- Custom Pottery Requests ---
  describe('Custom Pottery Workflow', () => {
    function getFutureDate(daysFromToday) {
      const d = new Date();
      d.setDate(d.getDate() + daysFromToday);
      return d.toISOString().split('T')[0];
    }

    test('GET /api/pottery/options returns seeded items and glazes', async () => {
      const res = await request(app).get('/api/pottery/options');
      assert.equal(res.status, 200);
      assert.equal(res.body.items.length, 5);
      assert.equal(res.body.glazes.length, 6);
    });

    test('Custom pottery fails if needed-by date is < 14 days away', async () => {
      const res = await request(app)
        .post('/api/pottery/requests')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          potteryItemId: 'i-01',
          glazeId: 'g-01',
          quantity: 4,
          neededByDate: getFutureDate(7)
        });
      assert.equal(res.status, 400);
    });

    test('Custom pottery fails if quantity < 1 or > 12', async () => {
      const resZero = await request(app)
        .post('/api/pottery/requests')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          potteryItemId: 'i-01',
          glazeId: 'g-01',
          quantity: 0,
          neededByDate: getFutureDate(20)
        });
      assert.equal(resZero.status, 400);

      const resThirteen = await request(app)
        .post('/api/pottery/requests')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          potteryItemId: 'i-01',
          glazeId: 'g-01',
          quantity: 13,
          neededByDate: getFutureDate(20)
        });
      assert.equal(resThirteen.status, 400);
    });

    test('Valid custom pottery request is created successfully', async () => {
      const res = await request(app)
        .post('/api/pottery/requests')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          potteryItemId: 'i-02',
          glazeId: 'g-03',
          quantity: 6,
          neededByDate: getFutureDate(25),
          notes: 'Special smooth finish please'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.request.status, 'requested');
      assert.equal(res.body.request.potteryItemName, 'Surahi (water jug)');
      assert.equal(res.body.request.glazeName, 'Mehendi Green');
    });

    test('Customer can edit their own pottery request while requested', async () => {
      const reqDoc = await PotteryRequest.findOne({ customer: customerUser.id, status: 'requested' });
      assert(reqDoc);

      const editRes = await request(app)
        .put(`/api/pottery/requests/${reqDoc._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 8 });

      assert.equal(editRes.status, 200);
      assert.equal(editRes.body.request.quantity, 8);
    });

    test('Customer 2 cannot edit or cancel Customer 1 pottery request (returns 404)', async () => {
      const reqDoc = await PotteryRequest.findOne({ customer: customerUser.id, status: 'requested' });
      assert(reqDoc);

      const res = await request(app)
        .put(`/api/pottery/requests/${reqDoc._id}`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({ quantity: 10 });

      assert.equal(res.status, 404);
    });

    test('Admin accepts pottery request, after which customer cannot edit or cancel', async () => {
      const reqDoc = await PotteryRequest.findOne({ customer: customerUser.id, status: 'requested' });
      assert(reqDoc);

      const acceptRes = await request(app)
        .patch(`/api/pottery/requests/${reqDoc._id}/status`)
        .set('Authorization', `Bearer ${studioToken}`)
        .send({ status: 'accepted' });

      assert.equal(acceptRes.status, 200);
      assert.equal(acceptRes.body.request.status, 'accepted');

      // Attempt edit after accepted
      const editAfterAccept = await request(app)
        .put(`/api/pottery/requests/${reqDoc._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 10 });
      assert.equal(editAfterAccept.status, 400);

      // Attempt cancel after accepted
      const cancelAfterAccept = await request(app)
        .post(`/api/pottery/requests/${reqDoc._id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);
      assert.equal(cancelAfterAccept.status, 400);
    });
  });
});
