import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Explicit allowlist: tests migrated from Jest to Vitest so far.
    // TODO(vitest-migration): port the remaining Jest tests (EmailRepository —
    // ~490 lines + resend.mock, TemplateService, component/integration/
    // performance) which still use the jest.* API on the removed Jest runner.
    include: [
      'tests/unit/services/EmailService.test.ts',
      'tests/unit/events/NotificationEventHandler.test.ts'
    ]
  }
});
