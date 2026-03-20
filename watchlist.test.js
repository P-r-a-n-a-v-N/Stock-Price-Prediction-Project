/**
 * backend/tests/watchlist.test.js
 */
'use strict';

const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../src/app');

const TEST_DB = `mongodb://localhost:27017/sp_test_wl_${Date.now()}`;

beforeAll(async () => { await mongoose.connect(TEST_DB); });
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

async function getAuthToken() {
  const email = `wl_${Date.now()}@example.com`;
  const res = await request(app).post('/api/auth/register').send({
    name: 'WL User', email, password: 'pass1234',
  });
  return res.body.token;
}

describe('Watchlist routes', () => {
  let token;
  beforeAll(async () => { token = await getAuthToken(); });

  it('GET /api/watchlist — returns empty list initially', async () => {
    const res = await request(app)
      .get('/api/watchlist')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.tickers).toEqual([]);
  });

  it('POST /api/watchlist — adds ticker', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'AAPL' });
    expect(res.status).toBe(200);
    expect(res.body.tickers).toContain('AAPL');
  });

  it('POST /api/watchlist — adding same ticker twice is idempotent', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'AAPL' });
    expect(res.status).toBe(200);
    const count = res.body.tickers.filter((t) => t === 'AAPL').length;
    expect(count).toBe(1);
  });

  it('POST /api/watchlist — adds second ticker', async () => {
    const res = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticker: 'TSLA' });
    expect(res.status).toBe(200);
    expect(res.body.tickers).toContain('TSLA');
    expect(res.body.tickers).toContain('AAPL');
  });

  it('DELETE /api/watchlist/:ticker — removes ticker', async () => {
    const res = await request(app)
      .delete('/api/watchlist/AAPL')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.tickers).not.toContain('AAPL');
    expect(res.body.tickers).toContain('TSLA');
  });

  it('GET /api/watchlist — requires auth', async () => {
    const res = await request(app).get('/api/watchlist');
    expect(res.status).toBe(401);
  });
});
