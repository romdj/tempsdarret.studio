import express from 'express';
import payload from 'payload';
import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { seedTemplates } from './seed-templates.js';

// Load environment variables
dotenvConfig();

fileURLToPath(import.meta.url);

const app = express();
const PORT = process.env.PAYLOAD_PORT ?? 3001;

// Initialize Payload
/* eslint-disable max-lines-per-function */
const start = async (): Promise<void> => {
  // Initialize Payload
  await payload.init({
    secret: process.env.PAYLOAD_SECRET ?? 'your-secret-here',
    express: app,
    onInit: async () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`);
    },
  });

  // Add your own express routes here

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
    });
  });

  // Template preview endpoint
  app.get('/api/notification-templates/:id/preview', async (req, res) => {
    try {
      const template = await payload.findByID({
        collection: 'notification-templates',
        id: req.params.id,
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Simple preview rendering
      const previewHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Template Preview: ${template.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .template-info { background: #f5f5f5; padding: 20px; margin-bottom: 20px; }
            .template-content { border: 1px solid #ddd; padding: 20px; }
            .variable { background: #fffbf0; padding: 2px 4px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="template-info">
            <h1>${template.name}</h1>
            <p><strong>Type:</strong> ${template.type}</p>
            <p><strong>Channel:</strong> ${template.channel}</p>
            <p><strong>Language:</strong> ${template.language}</p>
            <p><strong>Active:</strong> ${template.isActive ? 'Yes' : 'No'}</p>
          </div>
          <div class="template-content">
            ${template.channel === 'email' && template.templates?.subject ? 
              `<h2>Subject: ${template.templates.subject}</h2>` : ''
            }
            <h3>Content:</h3>
            ${template.templates?.html ??
              `<pre>${template.templates?.text ?? 'No content available'}</pre>`
            }
          </div>
          ${template.variables?.length ? `
            <div class="variables">
              <h3>Available Variables:</h3>
              <ul>
                ${template.variables.map(v => 
                  `<li><span class="variable">{{${v.name}}}</span> - ${v.description} (${v.type})</li>`
                ).join('')}
              </ul>
            </div>
          ` : ''}
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(previewHtml);
    } catch (error) {
      console.error('Template preview error:', error);
      res.status(500).json({ error: 'Failed to generate template preview' });
    }
  });

  app.listen(PORT, async () => {
    payload.logger.info(`Payload server started on port ${PORT}`);
    
    // Create default admin user if none exists
    try {
      const users = await payload.find({
        collection: 'users',
        limit: 1,
      });

      if (users.docs.length === 0) {
        await payload.create({
          collection: 'users',
          data: {
            email: process.env.PAYLOAD_ADMIN_EMAIL ?? 'admin@tempsdarret.com',
            password: process.env.PAYLOAD_ADMIN_PASSWORD ?? 'admin123!',
            role: 'admin',
            firstName: 'System',
            lastName: 'Administrator',
          },
        });
        payload.logger.info('Default admin user created');
      }
    } catch (error) {
      payload.logger.error('Failed to create default admin user:', error);
    }

    // Seed default channel configurations
    try {
      const channels = await payload.find({
        collection: 'notification-channels',
        limit: 1,
      });

      if (channels.docs.length === 0) {
        const defaultChannels = [
          {
            name: 'Email Notifications',
            channel: 'email',
            isEnabled: true,
            priority: 1,
            configuration: {
              defaultFromName: "Temps D'arrêt Photography",
              defaultFromEmail: process.env.DEFAULT_FROM_EMAIL ?? 'noreply@tempsdarret.com',
              defaultReplyTo: process.env.DEFAULT_REPLY_TO ?? 'contact@tempsdarret.com',
              trackOpens: true,
              trackClicks: true,
            },
            rateLimits: {
              enabled: true,
              maxPerMinute: 60,
              maxPerHour: 1000,
              maxPerDay: 10000,
            },
            retryPolicy: {
              maxAttempts: 3,
              initialDelay: 1000,
              backoffMultiplier: 2,
              maxDelay: 30000,
            },
            webhooks: {
              enabled: true,
              endpoint: `${process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3000'}/webhooks/delivery-status`,
            },
            healthCheck: {
              enabled: true,
              interval: 300000,
              timeout: 10000,
            },
          },
        ];

        for (const channelConfig of defaultChannels) {
          await payload.create({
            collection: 'notification-channels',
            data: channelConfig,
          });
        }
        payload.logger.info('Default channel configurations created');
      }
    } catch (error) {
      payload.logger.error('Failed to seed channel configurations:', error);
    }

    // Seed default templates
    try {
      await seedTemplates();
    } catch (error) {
      payload.logger.error('Failed to seed templates:', error);
    }
  });
};

start().catch((error) => {
  console.error('Failed to start Payload server:', error);
  process.exit(1);
});