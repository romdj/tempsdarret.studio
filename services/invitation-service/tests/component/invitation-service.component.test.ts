import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { createServer } from '../../src/server';

/**
 * Component test: boots the full invitation-service Fastify app in-process
 * against an ephemeral in-memory MongoDB (no external Mongo/Kafka), and
 * exercises the invitation lifecycle end-to-end through the real HTTP routes,
 * handlers, service, and repository. Event publishing is the no-op publisher.
 */
describe('Invitation Service Component', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer({ logger: false, mongoUrl: 'memory' });
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    const collections = Object.values(mongoose.connection.collections);
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  });

  const newInvitation = () => ({
    shootId: `shoot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    clientEmail: `client-${Date.now()}@example.com`,
    message: 'Welcome to your gallery'
  });

  it('GET /health reports a status', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBeDefined();
  });

  it('creates an invitation and retrieves it by id', async () => {
    const payload = newInvitation();

    const createRes = await app.inject({ method: 'POST', url: '/invitations', payload });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.body).data;
    expect(created).toMatchObject({
      id: expect.any(String),
      shootId: payload.shootId,
      clientEmail: payload.clientEmail,
      status: 'pending'
    });

    const getRes = await app.inject({ method: 'GET', url: `/invitations/${created.id}` });
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body).data).toMatchObject({ id: created.id, shootId: payload.shootId });
  });

  it('lists created invitations', async () => {
    await app.inject({ method: 'POST', url: '/invitations', payload: newInvitation() });
    await app.inject({ method: 'POST', url: '/invitations', payload: newInvitation() });

    const res = await app.inject({ method: 'GET', url: '/invitations' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);
  });

  it('marks an invitation as sent', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/invitations',
      payload: newInvitation()
    });
    const { id } = JSON.parse(createRes.body).data;

    const sendRes = await app.inject({
      method: 'POST',
      url: `/invitations/${id}/send`,
      payload: { message: 'Your gallery is ready' }
    });
    expect(sendRes.statusCode).toBe(200);
  });

  it('rejects an invalid create payload with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/invitations',
      payload: { clientEmail: 'not-an-email' }
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for a non-existent invitation id', async () => {
    const res = await app.inject({ method: 'GET', url: '/invitations/000000000000000000000000' });
    expect(res.statusCode).toBe(404);
  });
});
