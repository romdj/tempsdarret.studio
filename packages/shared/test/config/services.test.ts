import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SERVICE_REGISTRY,
  getServiceConfig,
  type ServiceName
} from '../../src/config/services.js';

const allServices = () => Object.keys(SERVICE_REGISTRY) as ServiceName[];

describe('service registry', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    // Clear the env vars the resolver reads, for deterministic defaults
    for (const key of ['PORT', 'HOST', 'MONGO_URI', 'MONGODB_URI', 'KAFKA_BROKERS', 'APP_BASE_URL']) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it('defines a valid port for every service', () => {
    for (const name of allServices()) {
      const { port } = getServiceConfig(name);
      expect(Number.isInteger(port)).toBe(true);
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThan(65536);
    }
  });

  it('assigns every service a distinct port (no collisions)', () => {
    const ports = allServices().map((name) => getServiceConfig(name).port);
    expect(new Set(ports).size).toBe(ports.length);
  });

  it('lets PORT env override the registry default', () => {
    process.env['PORT'] = '9999';
    expect(getServiceConfig('shoot-service').port).toBe(9999);
  });

  it('builds a per-service mongo uri from the registry db name', () => {
    for (const name of allServices()) {
      const { mongoUri } = getServiceConfig(name);
      expect(mongoUri).toContain(SERVICE_REGISTRY[name].dbName);
      expect(mongoUri).toMatch(/^mongodb:\/\/.+\/.+$/);
    }
  });

  it('accepts either MONGO_URI or MONGODB_URI (fixing the split env-var name)', () => {
    process.env['MONGODB_URI'] = 'mongodb://custom:27017/db';
    expect(getServiceConfig('portfolio-service').mongoUri).toBe('mongodb://custom:27017/db');
  });

  it('defaults kafka brokers to the host-facing 9093 broker', () => {
    expect(getServiceConfig('shoot-service').kafkaBrokers).toEqual(['localhost:9093']);
  });
});
