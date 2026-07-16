/**
 * Email Service
 *
 * Composes and sends transactional emails in reaction to domain events.
 * Templates are sourced from the CMS (via TemplateService); when the CMS has
 * no template for a given type a built-in fallback is used, so email still
 * sends without the CMS being seeded. Rendering + delivery are delegated to
 * TemplateService (Handlebars) and EmailRepository (Resend).
 */

import { randomUUID } from 'crypto';
import { TemplateService } from './TemplateService.js';
import { EmailRepository } from './repositories/EmailRepository.js';
import {
  NotificationTemplate,
  TemplateType,
  RenderedTemplate,
  NotificationMessage,
  SendResult
} from '../shared/contracts/notifications.types.js';

export interface SendEmailParams {
  recipientEmail: string;
  recipientName?: string;
  variables: Record<string, unknown>;
  shootId?: string;
  correlationId?: string;
}

const FALLBACK_TEMPLATES: Record<TemplateType, { subject: string; text: string; html: string }> = {
  'magic-link': {
    subject: 'Access your {{eventName}} gallery',
    text: 'Hi {{clientName}},\n\nYour photos from {{eventName}} are ready. Access your gallery here: {{magicLinkUrl}}\n\nThis link expires on {{expirationDate}}.',
    html: '<p>Hi {{clientName}},</p><p>Your photos from <strong>{{eventName}}</strong> are ready.</p><p><a href="{{magicLinkUrl}}">Access your gallery</a></p><p>This link expires on {{expirationDate}}.</p>'
  },
  'photos-ready': {
    subject: 'Your {{eventName}} photos are ready',
    text: 'Hi {{clientName}},\n\nYour gallery for {{eventName}} is now available: {{galleryUrl}}',
    html: '<p>Hi {{clientName}},</p><p>Your gallery for <strong>{{eventName}}</strong> is now available.</p><p><a href="{{galleryUrl}}">View your photos</a></p>'
  },
  'shoot-update': {
    subject: 'Update on your {{eventName}} project',
    text: 'Hi {{clientName}},\n\n{{updateMessage}}',
    html: '<p>Hi {{clientName}},</p><p>{{updateMessage}}</p>'
  },
  reminder: {
    subject: 'Reminder: your {{eventName}} gallery access',
    text: 'Hi {{clientName}},\n\nThis is a reminder that your gallery link expires on {{expirationDate}}: {{magicLinkUrl}}',
    html: '<p>Hi {{clientName}},</p><p>Your gallery link expires on {{expirationDate}}.</p><p><a href="{{magicLinkUrl}}">Access your gallery</a></p>'
  },
  welcome: {
    subject: 'Welcome to Temps D’arrêt',
    text: 'Hi {{clientName}},\n\nWelcome! Your gallery is available at {{magicLinkUrl}}',
    html: '<p>Hi {{clientName}},</p><p>Welcome! <a href="{{magicLinkUrl}}">Access your gallery</a></p>'
  }
};

export class EmailService {
  constructor(
    private readonly templateService: TemplateService,
    private readonly emailRepository: EmailRepository
  ) {}

  async sendMagicLinkEmail(params: SendEmailParams): Promise<SendResult> {
    return this.sendTemplatedEmail('magic-link', params);
  }

  async sendPhotosReadyEmail(params: SendEmailParams): Promise<SendResult> {
    return this.sendTemplatedEmail('photos-ready', params);
  }

  async sendShootUpdateEmail(params: SendEmailParams): Promise<SendResult> {
    return this.sendTemplatedEmail('shoot-update', params);
  }

  async sendReminderEmail(params: SendEmailParams): Promise<SendResult> {
    return this.sendTemplatedEmail('reminder', params);
  }

  private async sendTemplatedEmail(type: TemplateType, params: SendEmailParams): Promise<SendResult> {
    const template = (await this.templateService.getTemplate(type, 'email')) ?? this.fallbackTemplate(type);
    const rendered = await this.templateService.renderTemplate(template, params.variables);
    return this.emailRepository.send(this.buildMessage(type, params, rendered));
  }

  private buildMessage(
    type: TemplateType,
    params: SendEmailParams,
    rendered: RenderedTemplate
  ): NotificationMessage {
    const now = new Date();
    return {
      id: randomUUID(),
      channel: 'email',
      templateType: type,
      priority: 'normal',
      recipient: { email: params.recipientEmail, name: params.recipientName },
      content: {
        subject: rendered.subject,
        message: rendered.text,
        html: rendered.html
      },
      variables: params.variables,
      delivery: { status: 'queued', attempts: 0, maxAttempts: 3 },
      metadata: {
        shootId: params.shootId,
        correlationId: params.correlationId,
        sourceEvent: `${type}.notification`
      },
      createdAt: now,
      updatedAt: now
    };
  }

  private fallbackTemplate(type: TemplateType): NotificationTemplate {
    const content = FALLBACK_TEMPLATES[type];
    const now = new Date();
    return {
      id: `fallback-${type}`,
      name: `Fallback ${type}`,
      type,
      channel: 'email',
      templates: { subject: content.subject, text: content.text, html: content.html },
      variables: [],
      settings: {},
      isActive: true,
      language: 'en',
      createdAt: now,
      updatedAt: now
    };
  }
}
