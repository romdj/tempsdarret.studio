import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, Field, TextField } from 'payload';
import { NotificationChannels } from '../../../src/payload/collections/NotificationChannels.js';
import { NotificationTemplates } from '../../../src/payload/collections/NotificationTemplates.js';
import { TemplateVariables } from '../../../src/payload/collections/TemplateVariables.js';

// Payload supplies request/context arguments at runtime; these hooks only use data.
function validate(hook: CollectionBeforeValidateHook, data?: Record<string, unknown>) {
  return hook({ data } as Parameters<CollectionBeforeValidateHook>[0]);
}

function fieldAt(fields: Field[], ...names: string[]): Field {
  const [name, ...rest] = names;
  const field = fields.find((candidate) => 'name' in candidate && candidate.name === name);
  if (!field) throw new Error(`Missing field: ${name}`);
  if (!rest.length) return field;
  if (!('fields' in field)) throw new Error(`Field ${name} has no children`);
  return fieldAt(field.fields, ...rest);
}

function validateField(field: Field, value: string | null | undefined, data = {}) {
  const textField = field as TextField;
  if (textField.hasMany) throw new Error('Expected a single-value field');
  const validator = textField.validate!;
  return validator(value, { data } as Parameters<typeof validator>[1]);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('notification channel validation', () => {
  const hook = NotificationChannels.hooks!.beforeValidate![0];

  it.each([undefined, {}, { defaultFromEmail: '' }])(
    'rejects enabled email channels without a sender: %j',
    (configuration) => {
      expect(() => validate(hook, { channel: 'email', isEnabled: true, configuration }))
        .toThrow('Email channel requires a default from email address');
    },
  );

  it.each([
    undefined,
    {},
    { channel: 'email', isEnabled: false },
    { channel: 'sms', isEnabled: true },
    { channel: 'email', isEnabled: true, configuration: { defaultFromEmail: 'studio@example.com' } },
  ])('preserves valid or partial channel data: %j', async (data) => {
    expect(await validate(hook, data)).toBe(data);
  });

  it.each([
    [undefined, true, 'Webhook endpoint is required when webhooks are enabled'],
    ['', true, 'Webhook endpoint is required when webhooks are enabled'],
    ['ftp://example.com', true, 'Webhook endpoint must be a valid URL'],
    ['https://', true, 'Webhook endpoint must be a valid URL'],
    ['https://example.com/events', true, true],
    ['http://localhost/events', true, true],
    [undefined, false, true],
    [undefined, undefined, true],
  ])('validates webhook endpoint %s with enabled=%s', (value, enabled, expected) => {
    const field = fieldAt(NotificationChannels.fields, 'webhooks', 'endpoint');
    expect(validateField(field, value, { webhooks: { enabled } })).toBe(expected);
  });
});

describe('notification template hooks', () => {
  const hook = NotificationTemplates.hooks!.beforeValidate![0];

  it.each([{}, { subject: '' }, { subject: null }])('rejects an email template without a subject: %j', (templates) => {
    expect(() => validate(hook, { channel: 'email', templates }))
      .toThrow('Email templates must have a subject line');
  });

  it.each([
    undefined,
    {},
    { channel: 'email' },
    { channel: 'email', templates: { subject: 'Your photos are ready' } },
    { channel: 'sms', templates: { text: 'Your photos are ready' } },
  ])('preserves valid or partial template data: %j', async (data) => {
    expect(await validate(hook, data)).toBe(data);
  });

  it.each(['create', 'update'] as const)('records the %s operation in the audit log', (operation) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T16:00:00Z'));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const audit = NotificationTemplates.hooks!.afterChange![0];
    audit({ doc: { name: 'Gallery invitation' }, operation } as Parameters<typeof audit>[0]);
    expect(log).toHaveBeenCalledWith(`Template Gallery invitation was ${operation}d at 2026-09-09T16:00:00.000Z`);
  });
});

describe('template variable validation', () => {
  it.each(['clientName', '_client', 'photo_count2'])('accepts the identifier %s', (value) => {
    const field = fieldAt(TemplateVariables.fields, 'name');
    expect(validateField(field, value)).toBe(true);
  });

  it.each([undefined, null, '', '2photos', 'client name', 'client-name', 'client.name'])('rejects invalid identifier %s', (value) => {
    const field = fieldAt(TemplateVariables.fields, 'name');
    expect(validateField(field, value)).toBe('Variable name must start with a letter or underscore and contain only letters, numbers, and underscores');
  });

  it('trims the variable name without losing the other fields', async () => {
    const hook = TemplateVariables.hooks!.beforeChange![0];
    const data = { name: '  clientName  ', description: 'Client display name' };
    const result = await hook({ data } as unknown as Parameters<CollectionBeforeChangeHook>[0]);
    expect(result).toEqual({ name: 'clientName', description: 'Client display name' });
  });

  it.each([undefined, {}, { name: '' }])('handles absent variable names: %j', async (data) => {
    const hook = TemplateVariables.hooks!.beforeChange![0];
    expect(await hook({ data } as Parameters<CollectionBeforeChangeHook>[0])).toBe(data);
  });
});
