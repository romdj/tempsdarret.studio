/**
 * Notification Service Types
 * Core types for multi-channel notification system
 */

export type NotificationChannel = 'email' | 'slack' | 'sms' | 'whatsapp' | 'push';
export type TemplateType = 'magic-link' | 'photos-ready' | 'shoot-update' | 'reminder' | 'welcome';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type DeliveryStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced';

// Base notification message structure
export interface NotificationMessage {
  id: string;
  channel: NotificationChannel;
  templateType: TemplateType;
  priority: NotificationPriority;
  
  // Recipient information
  recipient: {
    id?: string;
    email?: string;
    phone?: string;
    slackUserId?: string;
    pushToken?: string;
    name?: string;
  };
  
  // Message content (channel-specific)
  content: {
    subject?: string; // For email
    message: string;
    html?: string; // For email
    attachments?: Attachment[];
  };
  
  // Template variables
  variables: Record<string, unknown>;
  
  // Delivery tracking
  delivery: {
    status: DeliveryStatus;
    attempts: number;
    maxAttempts: number;
    lastAttempt?: Date;
    deliveredAt?: Date;
    error?: {
      code: string;
      message: string;
    };
    providerMessageId?: string; // External provider ID
  };
  
  // Context
  metadata: {
    shootId?: string;
    correlationId?: string;
    sourceEvent: string;
    userId?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// Attachment for messages
export interface Attachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  disposition?: 'attachment' | 'inline';
}

// Template structure
export interface NotificationTemplate {
  id: string;
  name: string;
  type: TemplateType;
  channel: NotificationChannel;
  
  // Content templates
  templates: {
    subject?: string; // For email/sms subject
    text: string; // Plain text version
    html?: string; // HTML version for email
    markdown?: string; // For Slack/Discord
  };
  
  // Template variables
  variables: TemplateVariable[];
  
  // Channel-specific settings
  settings: {
    email?: EmailSettings;
    slack?: SlackSettings;
    sms?: SmsSettings;
    whatsapp?: WhatsAppSettings;
  };
  
  // Metadata
  isActive: boolean;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

// Template variable definition
export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'url';
  required: boolean;
  defaultValue?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}

// Channel-specific settings
export interface EmailSettings {
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface SlackSettings {
  channel?: string;
  username?: string;
  iconEmoji?: string;
  iconUrl?: string;
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
}

export interface SmsSettings {
  fromNumber?: string;
  maxLength?: number;
}

export interface WhatsAppSettings {
  fromNumber?: string;
  templateName?: string; // For WhatsApp Business API templates
}

// Repository interfaces for different channels
export interface NotificationRepository {
  send(message: NotificationMessage): Promise<SendResult>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  updateDeliveryStatus(messageId: string, status: DeliveryStatus, details?: unknown): Promise<void>;
}

// Send result from notification providers
export interface SendResult {
  success: boolean;
  messageId?: string; // Provider's message ID
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

// Template repository interface
export interface TemplateRepository {
  getTemplate(type: TemplateType, channel: NotificationChannel): Promise<NotificationTemplate | null>;
  renderTemplate(template: NotificationTemplate, variables: Record<string, unknown>): Promise<RenderedTemplate>;
  getAllTemplates(channel?: NotificationChannel): Promise<NotificationTemplate[]>;
}

// Rendered template result
export interface RenderedTemplate {
  subject?: string;
  text: string;
  html?: string;
  markdown?: string;
  variables: Record<string, unknown>; // Resolved variables
}

// Notification job for queue processing
export interface NotificationJob {
  id: string;
  channel: NotificationChannel;
  templateType: TemplateType;
  priority: NotificationPriority;

  recipient: NotificationMessage['recipient'];
  variables: Record<string, unknown>;
  
  metadata: NotificationMessage['metadata'];
  
  // Job-specific settings
  delay?: number; // Delay in milliseconds
  scheduledFor?: Date;
  maxAttempts?: number;
}

// Client preferences for multi-channel notifications
export interface ClientNotificationPreferences {
  clientId: string;
  email?: string;
  phone?: string;
  slackUserId?: string;
  
  // Channel preferences
  channels: {
    email: boolean;
    sms: boolean;
    slack: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  
  // Notification type preferences
  notifications: {
    photosReady: NotificationChannel[];
    shootUpdates: NotificationChannel[];
    reminders: NotificationChannel[];
    marketing: NotificationChannel[];
  };
  
  // Delivery preferences
  timing: {
    immediate: boolean;
    quiet_hours: {
      enabled: boolean;
      start: string; // HH:MM format
      end: string; // HH:MM format
      timezone: string;
    };
  };
  
  language: string;
  unsubscribed: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}