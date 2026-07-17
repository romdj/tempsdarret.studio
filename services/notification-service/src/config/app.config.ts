import { getServiceConfig } from '@tempsdarret/shared/config';

// Derived from the canonical service registry (single source of truth);
// env vars still override at runtime. Resend settings feed the email sender.
export const appConfig = {
  ...getServiceConfig('notification-service'),
  resend: {
    apiKey: process.env['RESEND_API_KEY'] ?? '',
    defaultFromEmail: process.env['DEFAULT_FROM_EMAIL'] ?? 'noreply@tempsdarret.com',
    defaultFromName: process.env['DEFAULT_FROM_NAME'] ?? "Temps D'arrêt Photography"
  }
};
