/**
 * Seed Templates for Payload CMS
 * Creates default notification templates for photography business
 */

import payload from 'payload';

export const seedTemplates = async () => {
  console.log('📦 Seeding default notification templates...');

  try {
    // Check if templates already exist
    const existingTemplates = await payload.find({
      collection: 'notification-templates',
      limit: 1,
    });

    if (existingTemplates.docs.length > 0) {
      console.log('Templates already exist, skipping seed');
      return;
    }

    // Default template data
    const templates = [
      {
        name: 'Magic Link Invitation Email',
        type: 'magic-link',
        channel: 'email',
        language: 'en',
        isActive: true,
        priority: 10,
        templates: {
          subject: '🔗 Access Your {{eventName}} Photos',
          text: `Hi {{clientName}},

Your photos from {{eventName}} are ready for viewing and download.

Access your gallery: {{magicLinkUrl}}

This link will expire on {{formatDate expirationDate}}.

If you have any questions, simply reply to this email.

Best regards,
{{photographerName}}
{{photographerEmail}}`,
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Photos Are Ready</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f8f9fa;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
      padding: 20px 0;
      border-bottom: 2px solid #f0f0f0;
    }
    .header h1 {
      color: #2c3e50;
      margin: 0;
      font-size: 28px;
    }
    .button { 
      display: inline-block; 
      padding: 16px 32px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      text-decoration: none; 
      border-radius: 25px; 
      margin: 25px 0;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .info-box {
      background: #f8f9ff;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #eee; 
      font-size: 14px; 
      color: #666; 
      text-align: center;
    }
    .details {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .logo {
      text-align: center;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h2 style="color: #667eea; margin: 0;">📸 Temps D'arrêt Photography</h2>
    </div>
    
    <div class="header">
      <h1>Your {{eventName}} Photos Are Ready!</h1>
    </div>
    
    <p style="font-size: 16px;">Hi <strong>{{clientName}}</strong>,</p>
    
    <p>Great news! Your photos from <strong>{{eventName}}</strong> have been processed and are now available for viewing and download in your private gallery.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{magicLinkUrl}}" class="button">🎯 View Your Photos</a>
    </div>
    
    <div class="info-box">
      <p><strong>⏰ Important:</strong> This secure link will expire on <strong>{{formatDate expirationDate}}</strong>.</p>
    </div>
    
    {{#if eventDate}}
    <div class="details">
      <p><strong>📅 Event Date:</strong> {{formatDate eventDate}}</p>
      {{#if eventLocation}}
      <p><strong>📍 Location:</strong> {{eventLocation}}</p>
      {{/if}}
    </div>
    {{/if}}
    
    <p>In your gallery, you'll be able to:</p>
    <ul style="padding-left: 20px;">
      <li>📱 View all your photos in high resolution</li>
      <li>⬇️ Download your favorites</li>
      <li>🖼️ Share photos with family and friends</li>
      <li>⭐ Mark your favorite shots</li>
    </ul>
    
    <div class="footer">
      <p>If you have any questions or need assistance, simply reply to this email.</p>
      <p><strong>Best regards,</strong><br>
      {{photographerName}}<br>
      <a href="mailto:{{photographerEmail}}" style="color: #667eea;">{{photographerEmail}}</a></p>
      
      <p style="margin-top: 20px; font-size: 12px; color: #999;">
        This is an automated message from Temps D'arrêt Photography.<br>
        Please do not reply to this email address.
      </p>
    </div>
  </div>
</body>
</html>`,
        },
        variables: [
          { name: 'clientName', description: 'Client full name', type: 'string', required: true },
          { name: 'eventName', description: 'Name of the event/shoot', type: 'string', required: true },
          { name: 'magicLinkUrl', description: 'Secure gallery access URL', type: 'url', required: true },
          { name: 'expirationDate', description: 'Link expiration date', type: 'date', required: true },
          { name: 'photographerName', description: 'Photographer name', type: 'string', required: true },
          { name: 'photographerEmail', description: 'Photographer email', type: 'email', required: true },
          { name: 'eventDate', description: 'Date of the event', type: 'date', required: false },
          { name: 'eventLocation', description: 'Event location', type: 'string', required: false },
        ],
        settings: {
          trackOpens: true,
          trackClicks: true,
        },
      },
      
      {
        name: 'Photos Ready Email',
        type: 'photos-ready',
        channel: 'email',
        language: 'en',
        isActive: true,
        priority: 10,
        templates: {
          subject: '📸 Your {{eventName}} photos are ready!',
          text: `Hello {{clientName}},

Great news! All your photos from {{eventName}} have been processed and are now available for download.

Gallery Details:
- Total Photos: {{totalPhotoCount}}
- Event: {{eventName}}
- Gallery URL: {{galleryUrl}}

{{#if downloadInstructions}}
Download Instructions:
{{downloadInstructions}}
{{/if}}

Thank you for choosing Temps D'arrêt Photography!

Best regards,
{{photographerName}}`,
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Photos Ready for Download</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f8f9fa;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
    }
    .stats-box {
      background: #f0f8f0;
      border: 2px solid #43e97b;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 25px 0;
    }
    .button { 
      display: inline-block; 
      padding: 16px 32px; 
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      color: white; 
      text-decoration: none; 
      border-radius: 25px; 
      margin: 25px 0;
      font-weight: 600;
      font-size: 16px;
    }
    .footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #eee; 
      font-size: 14px; 
      color: #666; 
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Your Photos Are Ready!</h1>
      <p style="margin: 0; opacity: 0.9;">{{eventName}}</p>
    </div>
    
    <p style="font-size: 16px;">Hello <strong>{{clientName}}</strong>,</p>
    
    <p>Fantastic news! All your photos from <strong>{{eventName}}</strong> have been carefully processed and are now ready for download.</p>
    
    <div class="stats-box">
      <h3 style="margin-top: 0; color: #2d5a3d;">📊 Gallery Summary</h3>
      <p><strong>{{totalPhotoCount}}</strong> {{pluralize totalPhotoCount 'photo' 'photos'}} ready for download</p>
    </div>
    
    <div style="text-align: center;">
      <a href="{{galleryUrl}}" class="button">🌟 Access Your Gallery</a>
    </div>
    
    {{#if downloadInstructions}}
    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h4>📋 Download Instructions:</h4>
      <p>{{downloadInstructions}}</p>
    </div>
    {{/if}}
    
    <div class="footer">
      <p>Thank you for choosing <strong>Temps D'arrêt Photography</strong>!</p>
      <p>Best regards,<br>{{photographerName}}</p>
    </div>
  </div>
</body>
</html>`,
        },
        variables: [
          { name: 'clientName', description: 'Client full name', type: 'string', required: true },
          { name: 'eventName', description: 'Name of the event', type: 'string', required: true },
          { name: 'totalPhotoCount', description: 'Total number of photos', type: 'number', required: true },
          { name: 'galleryUrl', description: 'Gallery access URL', type: 'url', required: true },
          { name: 'photographerName', description: 'Photographer name', type: 'string', required: true },
          { name: 'downloadInstructions', description: 'Instructions for downloading', type: 'string', required: false },
        ],
        settings: {
          trackOpens: true,
          trackClicks: true,
        },
      },

      {
        name: 'Shoot Update Email',
        type: 'shoot-update',
        channel: 'email',
        language: 'en',
        isActive: true,
        priority: 10,
        templates: {
          subject: '📝 Update about your {{eventName}} shoot',
          text: `Hi {{clientName}},

I wanted to give you a quick update about your {{eventName}} shoot.

{{updateMessage}}

{{#if nextSteps}}
Next Steps:
{{nextSteps}}
{{/if}}

{{#if estimatedDelivery}}
Estimated Delivery: {{formatDate estimatedDelivery}}
{{/if}}

If you have any questions, feel free to reach out!

Best regards,
{{photographerName}}`,
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Shoot Update</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f8f9fa;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
      color: #2d3436;
      text-align: center;
      padding: 25px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .update-box {
      background: #fefefe;
      border-left: 4px solid #fdcb6e;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .next-steps {
      background: #e8f4fd;
      border: 1px solid #74b9ff;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #eee; 
      font-size: 14px; 
      color: #666; 
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📝 Shoot Update</h1>
      <p style="margin: 0; opacity: 0.8;">{{eventName}}</p>
    </div>
    
    <p>Hi <strong>{{clientName}}</strong>,</p>
    
    <p>I wanted to give you a quick update about your <strong>{{eventName}}</strong> shoot.</p>
    
    <div class="update-box">
      <p>{{updateMessage}}</p>
    </div>
    
    {{#if nextSteps}}
    <div class="next-steps">
      <h4 style="margin-top: 0; color: #0984e3;">🎯 Next Steps:</h4>
      <p>{{nextSteps}}</p>
    </div>
    {{/if}}
    
    {{#if estimatedDelivery}}
    <p><strong>📅 Estimated Delivery:</strong> {{formatDate estimatedDelivery}}</p>
    {{/if}}
    
    <p>If you have any questions, feel free to reach out!</p>
    
    <div class="footer">
      <p>Best regards,<br><strong>{{photographerName}}</strong></p>
    </div>
  </div>
</body>
</html>`,
        },
        variables: [
          { name: 'clientName', description: 'Client full name', type: 'string', required: true },
          { name: 'eventName', description: 'Name of the event', type: 'string', required: true },
          { name: 'updateMessage', description: 'Update message content', type: 'string', required: true },
          { name: 'photographerName', description: 'Photographer name', type: 'string', required: true },
          { name: 'nextSteps', description: 'Next steps information', type: 'string', required: false },
          { name: 'estimatedDelivery', description: 'Estimated delivery date', type: 'date', required: false },
        ],
        settings: {
          trackOpens: true,
          trackClicks: true,
        },
      },
    ];

    // Create templates
    for (const templateData of templates) {
      await payload.create({
        collection: 'notification-templates',
        data: templateData,
      });
    }

    console.log(`✅ Created ${templates.length} default templates`);

    // Seed template variables
    await seedTemplateVariables();

  } catch (error) {
    console.error('❌ Failed to seed templates:', error);
    throw error;
  }
};

const seedTemplateVariables = async () => {
  console.log('📦 Seeding template variables...');

  const variables = [
    {
      name: 'clientName',
      displayName: 'Client Name',
      description: 'Full name of the client',
      type: 'string',
      category: 'client',
      required: true,
      examples: [
        { value: 'Sarah Johnson', description: 'Full name format' },
        { value: 'Mr. & Mrs. Smith', description: 'Couple format' },
      ],
    },
    {
      name: 'eventName',
      displayName: 'Event Name',
      description: 'Name or description of the photography event',
      type: 'string',
      category: 'shoot',
      required: true,
      examples: [
        { value: 'Wedding Photography', description: 'Wedding shoot' },
        { value: 'Family Portrait Session', description: 'Portrait shoot' },
        { value: 'Corporate Headshots', description: 'Business shoot' },
      ],
    },
    {
      name: 'photographerName',
      displayName: 'Photographer Name',
      description: 'Name of the photographer',
      type: 'string',
      category: 'photographer',
      required: true,
      defaultValue: 'Temps D\'arrêt Photography',
      examples: [
        { value: 'John Photographer', description: 'Individual photographer' },
        { value: 'Temps D\'arrêt Photography', description: 'Business name' },
      ],
    },
    {
      name: 'photographerEmail',
      displayName: 'Photographer Email',
      description: 'Contact email for the photographer',
      type: 'email',
      category: 'photographer',
      required: false,
      defaultValue: 'contact@tempsdarret.com',
    },
    {
      name: 'magicLinkUrl',
      displayName: 'Magic Link URL',
      description: 'Secure URL for accessing the photo gallery',
      type: 'url',
      category: 'system',
      required: true,
    },
    {
      name: 'expirationDate',
      displayName: 'Link Expiration Date',
      description: 'Date when the magic link expires',
      type: 'date',
      category: 'system',
      required: true,
    },
    {
      name: 'eventDate',
      displayName: 'Event Date',
      description: 'Date when the photography event took place',
      type: 'date',
      category: 'shoot',
      required: false,
    },
    {
      name: 'eventLocation',
      displayName: 'Event Location',
      description: 'Location where the photography event took place',
      type: 'string',
      category: 'shoot',
      required: false,
      examples: [
        { value: 'Central Park, New York', description: 'Outdoor location' },
        { value: 'Grand Ballroom, Hotel Plaza', description: 'Indoor venue' },
      ],
    },
    {
      name: 'totalPhotoCount',
      displayName: 'Total Photo Count',
      description: 'Total number of photos in the gallery',
      type: 'number',
      category: 'system',
      required: false,
    },
    {
      name: 'galleryUrl',
      displayName: 'Gallery URL',
      description: 'URL to the photo gallery',
      type: 'url',
      category: 'system',
      required: false,
    },
  ];

  for (const variableData of variables) {
    try {
      await payload.create({
        collection: 'template-variables',
        data: variableData,
      });
    } catch (error) {
      // Skip if variable already exists
      if (!error.message?.includes('duplicate')) {
        console.error(`Failed to create variable ${variableData.name}:`, error);
      }
    }
  }

  console.log(`✅ Template variables seeded`);
};