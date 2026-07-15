import { getServiceConfig } from '@tempsdarret/shared/config';

// Derived from the canonical service registry (single source of truth);
// env vars still override at runtime. invitationTtl (a unit-bearing duration
// string, parsed to ms at use) and appBaseUrl feed the magic link carried in
// invitation.created.
export const appConfig = {
  ...getServiceConfig('invitation-service'),
  invitationTtl: process.env['INVITATION_TTL'] ?? '48h'
};
