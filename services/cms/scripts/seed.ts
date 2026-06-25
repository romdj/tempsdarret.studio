import { getPayload } from 'payload';
import config from '@payload-config';

type SeedTemplate = {
  key: string;
  description: string;
  subjectFr: string;
  subjectEn: string;
  bodyFr: string;
  bodyEn: string;
  variablesExample: Record<string, unknown>;
};

const TEMPLATES: SeedTemplate[] = [
  {
    key: 'magic-link-invitation',
    description:
      'Sent when a client is invited to view their gallery. Contains the magic-link URL and expiration.',
    subjectFr: 'Vos photos de {{eventName}} sont prêtes',
    subjectEn: 'Your {{eventName}} photos are ready',
    bodyFr: `<p>Bonjour {{clientName}},</p>
<p>Vos photos de <strong>{{eventName}}</strong> sont prêtes à être consultées et téléchargées.</p>
<p><a href="{{magicLinkUrl}}">Accéder à votre galerie</a></p>
<p>Ce lien expire le {{formatDate expirationDate}}.</p>
<p>Cordialement,<br>{{photographerName}}</p>`,
    bodyEn: `<p>Hi {{clientName}},</p>
<p>Your photos from <strong>{{eventName}}</strong> are ready to view and download.</p>
<p><a href="{{magicLinkUrl}}">Access your gallery</a></p>
<p>This link expires on {{formatDate expirationDate}}.</p>
<p>Best regards,<br>{{photographerName}}</p>`,
    variablesExample: {
      clientName: 'Marie Dupont',
      eventName: 'Mariage Marie et Jean',
      magicLinkUrl: 'https://tempsdarret.studio/gallery/abc123',
      expirationDate: '2026-07-25T00:00:00Z',
      photographerName: 'Temps D\'arrêt',
    },
  },
  {
    key: 'photos-ready',
    description: 'Sent when the gallery is published with the final photo count.',
    subjectFr: 'Vos photos sont prêtes : {{eventName}}',
    subjectEn: 'Your photos are ready: {{eventName}}',
    bodyFr: `<p>Bonjour {{clientName}},</p>
<p>Excellente nouvelle ! Toutes vos photos de <strong>{{eventName}}</strong> sont prêtes.</p>
<p><strong>{{totalPhotoCount}}</strong> photos disponibles au téléchargement.</p>
<p><a href="{{galleryUrl}}">Accéder à votre galerie</a></p>
<p>Cordialement,<br>{{photographerName}}</p>`,
    bodyEn: `<p>Hi {{clientName}},</p>
<p>Great news! All your photos from <strong>{{eventName}}</strong> are ready.</p>
<p><strong>{{totalPhotoCount}}</strong> photos available for download.</p>
<p><a href="{{galleryUrl}}">Access your gallery</a></p>
<p>Best regards,<br>{{photographerName}}</p>`,
    variablesExample: {
      clientName: 'Marie Dupont',
      eventName: 'Mariage Marie et Jean',
      totalPhotoCount: 245,
      galleryUrl: 'https://tempsdarret.studio/gallery/abc123',
      photographerName: 'Temps D\'arrêt',
    },
  },
  {
    key: 'shoot-update',
    description: 'Ad-hoc update from the photographer about an upcoming or in-progress shoot.',
    subjectFr: 'Mise à jour : {{eventName}}',
    subjectEn: 'Update: {{eventName}}',
    bodyFr: `<p>Bonjour {{clientName}},</p>
<p>{{updateMessage}}</p>
<p>Pour toute question, n'hésitez pas à répondre à ce courriel.</p>
<p>Cordialement,<br>{{photographerName}}</p>`,
    bodyEn: `<p>Hi {{clientName}},</p>
<p>{{updateMessage}}</p>
<p>Feel free to reply to this email with any questions.</p>
<p>Best regards,<br>{{photographerName}}</p>`,
    variablesExample: {
      clientName: 'Marie Dupont',
      eventName: 'Mariage Marie et Jean',
      updateMessage: 'Les photos seront prêtes vers la fin de la semaine.',
      photographerName: 'Temps D\'arrêt',
    },
  },
];

const seed = async (): Promise<void> => {
  const payload = await getPayload({ config });

  for (const template of TEMPLATES) {
    const existing = await payload.find({
      collection: 'email-templates',
      where: { key: { equals: template.key } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      payload.logger.info(`[seed] email-template '${template.key}' already exists, skipping`);
      continue;
    }

    const created = await payload.create({
      collection: 'email-templates',
      data: {
        key: template.key,
        description: template.description,
        subject: template.subjectFr,
        body: template.bodyFr,
        variablesExample: template.variablesExample,
        _status: 'published',
      },
      locale: 'fr',
    });

    await payload.update({
      collection: 'email-templates',
      id: created.id,
      data: {
        subject: template.subjectEn,
        body: template.bodyEn,
      },
      locale: 'en',
    });

    payload.logger.info(`[seed] email-template '${template.key}' created (fr + en)`);
  }

  payload.logger.info('[seed] done');
  process.exit(0);
};

seed().catch((err: unknown) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
