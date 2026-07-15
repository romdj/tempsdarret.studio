import { getServiceConfig } from '@tempsdarret/shared/config';

// Port, host, mongoUri and kafkaBrokers come from the canonical service
// registry (single source of truth); env vars still override at runtime.
export const appConfig = getServiceConfig('shoot-service');
