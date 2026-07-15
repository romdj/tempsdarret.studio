import { getServiceConfig } from '@tempsdarret/shared/config';

// Derived from the canonical service registry (single source of truth);
// env vars still override at runtime. invitationTtlMs (48h) and appBaseUrl
// feed the magic link carried in invitation.created.
export const appConfig = {
  ...getServiceConfig('invitation-service'),
  invitationTtlMs: process.env['INVITATION_TTL_MS']
    ? parseInt(process.env['INVITATION_TTL_MS'], 10)
    : 48 * 60 * 60 * 1000
};
