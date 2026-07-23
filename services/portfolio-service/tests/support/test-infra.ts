/**
 * `appConfig` (src/config/app.config.ts) is a module-level singleton derived
 * from `process.env` the moment it's first imported. ESM static imports are
 * evaluated before a test file's own top-level code (including `beforeAll`)
 * runs, so setting env vars inside `beforeAll` has no effect on a statically
 * imported `PortfolioServiceApp`.
 *
 * Call `configureTestInfra()` inside `beforeAll` *before* dynamically
 * importing `src/main.js` (`await import('../../src/main.js')`), so the
 * fresh, per-test-file module evaluation of `appConfig` picks up these
 * values.
 *
 * - Mongo: points at the local infra's authenticated admin user, isolated
 *   per suite via `dbName`.
 * - Kafka: defaults to the host-facing broker (9093); still overridable via
 *   `KAFKA_BROKERS` for CI/other environments.
 * - Port: always ephemeral (0) so concurrently-running suites never collide
 *   on a hardcoded port.
 */

import mongoose from 'mongoose';

const DEFAULT_MONGO_BASE_URI = 'mongodb://admin:admin_password@localhost:27017';
const DEFAULT_KAFKA_BROKERS = 'localhost:9093';

export const configureTestInfra = (dbName: string): void => {
  const mongoBaseUri = process.env['MONGO_TEST_BASE_URI'] ?? DEFAULT_MONGO_BASE_URI;

  // The admin user is provisioned on the `admin` database (docker-compose's
  // MONGO_INITDB_ROOT_USERNAME/PASSWORD), so auth must be verified there
  // even though the connection targets `dbName`.
  process.env['MONGO_URI'] = `${mongoBaseUri}/${dbName}?authSource=admin`;
  process.env['KAFKA_BROKERS'] = process.env['KAFKA_BROKERS'] ?? DEFAULT_KAFKA_BROKERS;
  process.env['PORT'] = '0';
};

/**
 * Drops the suite's test database so repeated runs against the shared,
 * always-up local Mongo start from a clean slate (no leftover slugs/ids
 * from a previous run causing spurious "already exists" failures). Call
 * from `afterAll`, after all assertions but before `app.stop()` disconnects
 * mongoose.
 */
export const dropTestDatabase = async (): Promise<void> => {
  await mongoose.connection.dropDatabase();
};
