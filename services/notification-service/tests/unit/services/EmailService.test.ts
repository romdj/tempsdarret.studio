import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockedObject } from 'vitest';
import { EmailService } from '../../../src/services/EmailService.js';
import { TemplateService } from '../../../src/services/TemplateService.js';
import { EmailRepository } from '../../../src/services/repositories/EmailRepository.js';
import type {
  NotificationTemplate,
  RenderedTemplate
} from '../../../src/shared/contracts/notifications.types.js';

const template = {
  id: 't1',
  name: 'Magic Link',
  type: 'magic-link',
  channel: 'email',
  templates: { subject: 'Access {{eventName}}', text: 'Hi {{clientName}}', html: '<p>{{magicLinkUrl}}</p>' },
  variables: [],
  settings: {},
  isActive: true,
  language: 'en',
  createdAt: new Date(),
  updatedAt: new Date()
} as NotificationTemplate;

const rendered: RenderedTemplate = {
  subject: 'Access Wedding',
  text: 'Hi Jane',
  html: '<p>https://app/gallery/access/tok</p>',
  variables: {}
};

describe('EmailService', () => {
  let templateService: MockedObject<TemplateService>;
  let emailRepository: MockedObject<EmailRepository>;
  let service: EmailService;

  beforeEach(() => {
    templateService = {
      getTemplate: vi.fn(),
      renderTemplate: vi.fn().mockResolvedValue(rendered)
    } as unknown as MockedObject<TemplateService>;

    emailRepository = {
      send: vi.fn().mockResolvedValue({ success: true, messageId: 'msg_1' })
    } as unknown as MockedObject<EmailRepository>;

    service = new EmailService(templateService, emailRepository);
  });

  it('renders the magic-link template and sends it via the repository', async () => {
    templateService.getTemplate.mockResolvedValue(template);

    const result = await service.sendMagicLinkEmail({
      recipientEmail: 'client@example.com',
      recipientName: 'Jane',
      variables: {
        clientName: 'Jane',
        eventName: 'Wedding',
        magicLinkUrl: 'https://app/gallery/access/tok'
      },
      shootId: 'shoot_1',
      correlationId: 'inv_1'
    });

    expect(templateService.getTemplate).toHaveBeenCalledWith('magic-link', 'email');
    expect(emailRepository.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateType: 'magic-link',
        recipient: expect.objectContaining({ email: 'client@example.com', name: 'Jane' }),
        content: expect.objectContaining({
          subject: 'Access Wedding',
          message: 'Hi Jane',
          html: '<p>https://app/gallery/access/tok</p>'
        }),
        metadata: expect.objectContaining({ shootId: 'shoot_1', correlationId: 'inv_1' })
      })
    );
    expect(result.success).toBe(true);
  });

  it('falls back to a built-in template when the CMS has none (so email still sends)', async () => {
    templateService.getTemplate.mockResolvedValue(null);

    const result = await service.sendMagicLinkEmail({
      recipientEmail: 'client@example.com',
      variables: {
        clientName: 'Jane',
        eventName: 'Wedding',
        magicLinkUrl: 'https://app/gallery/access/tok'
      }
    });

    // A fallback template is still rendered and sent
    expect(templateService.renderTemplate).toHaveBeenCalled();
    expect(emailRepository.send).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
