import { describe, it, expect, vi } from 'vitest';
import { dispatchMessage } from './kafka-consumer';

describe('dispatchMessage', () => {
  it('unwraps an enveloped event ({eventType,data}) into a flat event for the handler', async () => {
    const handler = vi.fn();
    const enveloped = JSON.stringify({
      eventId: 'evt_1',
      eventType: 'shoot.created',
      source: 'shoot-service',
      data: { shootId: 'shoot_1', clientEmail: 'c@example.com', photographerId: 'p_1' }
    });

    await dispatchMessage(enveloped, { 'shoot.created': handler });

    expect(handler).toHaveBeenCalledWith({
      eventType: 'shoot.created',
      shootId: 'shoot_1',
      clientEmail: 'c@example.com',
      photographerId: 'p_1'
    });
  });

  it('passes a flat event (no data envelope) straight through', async () => {
    const handler = vi.fn();
    const flat = JSON.stringify({
      eventType: 'user.created',
      userId: 'u_1',
      email: 'c@example.com',
      shootId: 'shoot_1'
    });

    await dispatchMessage(flat, { 'user.created': handler });

    expect(handler).toHaveBeenCalledWith({
      eventType: 'user.created',
      userId: 'u_1',
      email: 'c@example.com',
      shootId: 'shoot_1'
    });
  });

  it('ignores events with no registered handler', async () => {
    const handler = vi.fn();
    const msg = JSON.stringify({ eventType: 'shoot.updated', data: {} });

    await dispatchMessage(msg, { 'shoot.created': handler });

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores a null message value', async () => {
    const handler = vi.fn();
    await dispatchMessage(null, { 'shoot.created': handler });
    expect(handler).not.toHaveBeenCalled();
  });
});
