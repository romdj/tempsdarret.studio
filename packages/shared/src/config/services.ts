/**
 * Canonical service registry — the single source of truth for microservice
 * ports and database names. Every service's app.config and the E2E setup
 * derive their defaults from here, so ports can never silently drift or
 * collide across services, docker-compose, and the tests.
 *
 * Runtime values remain env-injectable (PORT, HOST, MONGO_URI, ...); the
 * registry only supplies the canonical default when no env override is set.
 */

export const SERVICE_REGISTRY = {
  'user-service': { port: 3002, dbName: 'tempsdarret-users' },
  'invitation-service': { port: 3003, dbName: 'tempsdarret-invitations' },
  'portfolio-service': { port: 3004, dbName: 'tempsdarret-portfolios' },
  'shoot-service': { port: 3005, dbName: 'tempsdarret-shoots' },
  'file-service': { port: 3006, dbName: 'tempsdarret-files' },
  'notification-service': { port: 3007, dbName: 'tempsdarret-notifications' }
} as const;

export type ServiceName = keyof typeof SERVICE_REGISTRY;

/**
 * Shared infrastructure defaults. Kafka defaults to the host-facing 9093
 * broker (docker-compose exposes PLAINTEXT_HOST on 9093); inside the docker
 * network services override KAFKA_BROKERS to kafka:9092.
 */
export const INFRA_DEFAULTS = {
  gatewayPort: 8000,
  mongoHost: 'localhost',
  mongoPort: 27017,
  kafkaBrokers: ['localhost:9093'],
  redisPort: 6379,
  appBaseUrl: 'http://localhost:5173'
} as const;

export interface ServiceRuntimeConfig {
  readonly serviceName: ServiceName;
  readonly port: number;
  readonly host: string;
  readonly env: 'development' | 'production' | 'test';
  readonly mongoUri: string;
  readonly kafkaBrokers: string[];
  readonly appBaseUrl: string;
}

/**
 * Resolve a service's runtime config: env override first, registry default
 * otherwise. Accepts both MONGO_URI and MONGODB_URI to end the split-name
 * inconsistency that existed across the service configs.
 */
export const getServiceConfig = (serviceName: ServiceName): ServiceRuntimeConfig => {
  const entry = SERVICE_REGISTRY[serviceName];
  const env = (process.env['NODE_ENV'] ?? 'development') as ServiceRuntimeConfig['env'];

  return {
    serviceName,
    port: process.env['PORT'] ? parseInt(process.env['PORT'], 10) : entry.port,
    host: process.env['HOST'] ?? '0.0.0.0',
    env,
    mongoUri:
      process.env['MONGO_URI'] ??
      process.env['MONGODB_URI'] ??
      `mongodb://${INFRA_DEFAULTS.mongoHost}:${INFRA_DEFAULTS.mongoPort}/${entry.dbName}`,
    kafkaBrokers: process.env['KAFKA_BROKERS']?.split(',') ?? [...INFRA_DEFAULTS.kafkaBrokers],
    appBaseUrl: process.env['APP_BASE_URL'] ?? INFRA_DEFAULTS.appBaseUrl
  };
};
