import { getServiceConfig } from '@tempsdarret/shared/config';

// Derived from the canonical service registry (single source of truth);
// env vars still override at runtime.
export const appConfig = getServiceConfig('portfolio-service');
