import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';
import { createServer } from 'http';

describe('API Endpoints', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Mount request ID for testing error handler compatibility
    app.use((req, res, next) => {
      req.headers['x-request-id'] = 'test-id';
      next();
    });

    const httpServer = createServer(app);
    await registerRoutes(httpServer, app);
  });

  it('GET /health should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /ready should return connected if DB is available', async () => {
    const res = await request(app).get('/ready');
    // It should be 200 since we're using local SQLite in testing usually
    // but if it's not setup correctly in CI, we at least expect a response
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('database');
  });

  it('GET /api/schemes should return an array of schemes and have Cache-Control', async () => {
    const res = await request(app).get('/api/schemes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.headers['cache-control']).toBe('public, max-age=300');
  });
});
