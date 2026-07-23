import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';

/**
 * Component test: boots the fully-routed file-service app in-process via
 * `buildApp()` and exercises the real routes/handlers/services/repository.
 *
 * The service's global `tests/setup.ts` already starts an in-memory MongoDB,
 * connects mongoose, and sets STORAGE_BASE_PATH before this runs — `buildApp`
 * reuses that connection. The Kafka producer is the in-process
 * MockEventProducer, so no broker is needed.
 */
describe('File Service Component', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { buildApp } = await import('../../src/main.js');
    ({ app } = await buildApp());
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health reports the service as healthy', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ status: 'healthy', service: 'file-service' });
  });

  it('GET /files returns an empty list on a fresh database', async () => {
    const res = await app.inject({ method: 'GET', url: '/files' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(0);
  });

  it('GET /files/:id reports not-found for an unknown file', async () => {
    const res = await app.inject({ method: 'GET', url: '/files/507f1f77bcf86cd799439011' });
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({ code: 'FILE_NOT_FOUND' });
  });
});
