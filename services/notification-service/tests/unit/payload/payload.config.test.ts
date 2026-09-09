import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from 'payload';

const mocks = vi.hoisted(() => ({
  buildConfig: vi.fn(async (config: Config) => config),
  mongooseAdapter: vi.fn(() => ({ name: 'test-adapter' })),
}));

vi.mock('payload', () => ({ buildConfig: mocks.buildConfig }));
vi.mock('@payloadcms/db-mongodb', () => ({ mongooseAdapter: mocks.mongooseAdapter }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => vi.unstubAllEnvs());

describe('Payload Local API configuration', () => {
  it('uses the configured secret and MongoDB URI and registers all notification collections', async () => {
    vi.stubEnv('PAYLOAD_SECRET', 'test-only-secret');
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost/test-notification-cms');
    const { default: pendingConfig } = await import('../../../src/payload/payload.config.js');
    const config = await pendingConfig;

    expect(config.secret).toBe('test-only-secret');
    expect(mocks.mongooseAdapter).toHaveBeenCalledWith({ url: 'mongodb://localhost/test-notification-cms' });
    expect(config.db).toEqual({ name: 'test-adapter' });
    expect(config.collections?.map(({ slug }) => slug)).toEqual([
      'notification-templates', 'template-variables', 'notification-channels',
    ]);
    expect(mocks.buildConfig).toHaveBeenCalledOnce();
  });

  it('uses the local development defaults when environment variables are absent', async () => {
    vi.stubEnv('PAYLOAD_SECRET', undefined);
    vi.stubEnv('MONGODB_URI', undefined);
    const { default: pendingConfig } = await import('../../../src/payload/payload.config.js');
    const config = await pendingConfig;

    expect(config.secret).toBe('your-secret-here');
    expect(mocks.mongooseAdapter).toHaveBeenCalledWith({ url: 'mongodb://localhost/notification-templates' });
  });
});
