/**
 * Zod schemas for validating documents read from Payload CMS.
 *
 * Payload's local API returns loosely-typed documents (Record<string, unknown>).
 * Rather than asserting their shape with casts, we parse them at the boundary:
 * this validates the data coming out of the CMS AND narrows it to a precise
 * type, so the rest of the code is fully typed with no `as` casts.
 */

import { z } from 'zod';

export const notificationChannelSchema = z.enum(['email', 'slack', 'sms', 'whatsapp', 'push']);
export const templateTypeSchema = z.enum(['magic-link', 'photos-ready', 'shoot-update', 'reminder', 'welcome']);
export const variableTypeSchema = z.enum(['string', 'number', 'boolean', 'date', 'url']);

export const payloadTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: templateTypeSchema,
  channel: notificationChannelSchema,
  language: z.string().default('en'),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
  templates: z.object({
    subject: z.string().optional(),
    text: z.string(),
    html: z.string().optional()
  }),
  variables: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().default(''),
        type: variableTypeSchema.default('string'),
        required: z.boolean().default(false),
        defaultValue: z.string().optional()
      })
    )
    .default([]),
  settings: z
    .object({
      fromName: z.string().optional(),
      fromEmail: z.string().optional(),
      replyTo: z.string().optional(),
      trackOpens: z.boolean().optional(),
      trackClicks: z.boolean().optional()
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type PayloadTemplate = z.infer<typeof payloadTemplateSchema>;

export const payloadChannelConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  channel: notificationChannelSchema,
  isEnabled: z.boolean(),
  priority: z.number(),
  configuration: z.record(z.string(), z.unknown()).default({}),
  rateLimits: z.object({
    enabled: z.boolean(),
    maxPerMinute: z.number(),
    maxPerHour: z.number(),
    maxPerDay: z.number()
  }),
  retryPolicy: z.object({
    maxAttempts: z.number(),
    initialDelay: z.number(),
    backoffMultiplier: z.number(),
    maxDelay: z.number()
  }),
  webhooks: z.object({
    enabled: z.boolean(),
    endpoint: z.string().optional(),
    secret: z.string().optional()
  })
});
export type PayloadChannelConfig = z.infer<typeof payloadChannelConfigSchema>;

export const payloadTemplateVariableSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  type: z.string(),
  category: z.string(),
  required: z.boolean(),
  defaultValue: z.string().optional()
});
export type PayloadTemplateVariable = z.infer<typeof payloadTemplateVariableSchema>;
