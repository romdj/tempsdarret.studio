import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { createServer } from '../../src/server';

/**
 * Component test: boots the full user-service Fastify app in-process against an
 * ephemeral in-memory MongoDB (no external Mongo/Kafka), and exercises the user
 * lifecycle end-to-end through the real HTTP routes, handlers, service, and
 * repository. Kafka publishing is the built-in no-op publisher.
 */
describe('User Service Component', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer({ logger: false, mongoUrl: 'memory' });
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  });

  const newUser = () => ({
    email: `client-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    name: 'Component Test User',
    role: 'client' as const
  });

  it('GET /health reports a valid status', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
  });

  it('creates, retrieves, updates, and deactivates a user', async () => {
    const payload = newUser();

    // Create
    const createRes = await app.inject({ method: 'POST', url: '/users', payload });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.body).data;
    expect(created).toMatchObject({
      id: expect.any(String),
      email: payload.email,
      name: payload.name,
      role: 'client',
      isActive: true
    });

    // Retrieve by id
    const getRes = await app.inject({ method: 'GET', url: `/users/${created.id}` });
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body).data).toMatchObject({ id: created.id, email: payload.email });

    // Update
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/users/${created.id}`,
      payload: { name: 'Renamed User' }
    });
    expect(patchRes.statusCode).toBe(200);
    expect(JSON.parse(patchRes.body).data).toMatchObject({ id: created.id, name: 'Renamed User' });

    // Deactivate
    const deleteRes = await app.inject({ method: 'DELETE', url: `/users/${created.id}` });
    expect(deleteRes.statusCode).toBe(200);
    expect(JSON.parse(deleteRes.body).data).toMatchObject({ id: created.id, isActive: false });
  });

  it('lists created users with pagination metadata', async () => {
    await app.inject({ method: 'POST', url: '/users', payload: newUser() });
    await app.inject({ method: 'POST', url: '/users', payload: newUser() });

    const res = await app.inject({ method: 'GET', url: '/users' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);
    expect(body.meta).toMatchObject({ total: 2, page: expect.any(Number), limit: expect.any(Number) });
  });

  it('rejects an invalid create payload with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { email: 'not-an-email', name: '', role: 'client' }
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for a non-existent user id', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/000000000000000000000000' });
    expect(res.statusCode).toBe(404);
  });
});
