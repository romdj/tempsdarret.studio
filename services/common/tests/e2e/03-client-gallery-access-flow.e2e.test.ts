import { describe, it, expect, beforeAll } from 'vitest';

/**
 * E2E Test: Client Gallery Access Flow
 *
 * This test covers the complete client access workflow:
 * 1. Shoot created with client email
 * 2. Invitation sent with magic link
 * 3. Client clicks magic link
 * 4. Client accesses shoot via /portfolio?ref=xyz
 * 5. Client views and downloads photos
 *
 * Happy Path: Successful client access with downloads
 * Alternate Paths:
 * - Expired magic link
 * - Expired shoot access
 * - Downloads disabled
 * - Invalid shoot reference
 */
describe('E2E: Client Gallery Access Flow', () => {
  let shootServiceUrl: string;
  let inviteServiceUrl: string;
  let fileServiceUrl: string;
  let shootId: string;
  let shootReference: string;
  let magicLinkToken: string;
  let clientEmail: string;

  beforeAll(() => {
    shootServiceUrl = process.env.SHOOT_SERVICE_URL || 'http://localhost:3006';
    inviteServiceUrl = process.env.INVITE_SERVICE_URL || 'http://localhost:3004';
    fileServiceUrl = process.env.FILE_SERVICE_URL || 'http://localhost:3003';
    clientEmail = 'client.test@example.com';
  });

  describe('Happy Path: Complete Client Access Flow', () => {
    it('should allow client to access and download photos', async () => {
      // Step 1: Photographer creates shoot with client access enabled
      const createShootResponse = await fetch(`${shootServiceUrl}/shoots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographerId: 'photographer-123',
          category: 'weddings',
          title: 'Johnson Wedding',
          clientEmail,
          clientName: 'Emily Johnson',
          scheduledDate: '2024-08-10',
          'access.allowClientAccess': true,
          'access.allowDownloads': true,
          'access.expiresAt': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
      });

      expect(createShootResponse.status).toBe(201);
      const shoot = await createShootResponse.json();
      shootId = shoot.data.id;
      shootReference = shoot.data.reference;

      expect(shootReference).toBeDefined();
      expect(shootReference).toMatch(/^[a-z0-9-]+$/);

      // Step 2: Generate magic link invitation
      const createInviteResponse = await fetch(`${inviteServiceUrl}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shootId,
          clientEmail,
          message: 'Your wedding photos are ready to view!'
        })
      });

      expect(createInviteResponse.status).toBe(201);
      const invitation = await createInviteResponse.json();
      magicLinkToken = invitation.data.magicLinkToken;

      expect(magicLinkToken).toBeDefined();
      expect(magicLinkToken).toHaveLength(64); // 64 char hex string

      // Step 3: Client clicks magic link and validates
      const validateResponse = await fetch(`${inviteServiceUrl}/magic-links/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: magicLinkToken,
          shootId
        })
      });

      expect(validateResponse.status).toBe(200);
      const authResponse = await validateResponse.json();

      expect(authResponse.data).toHaveProperty('accessToken');
      expect(authResponse.data).toHaveProperty('user');
      expect(authResponse.data.user.email).toBe(clientEmail);

      const accessToken = authResponse.data.accessToken;

      // Step 4: Client accesses shoot via reference
      const accessShootResponse = await fetch(
        `${shootServiceUrl}/shoots/by-ref/${shootReference}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      expect(accessShootResponse.status).toBe(200);
      const shootData = await accessShootResponse.json();

      expect(shootData.data.id).toBe(shootId);
      expect(shootData.data.access.allowClientAccess).toBe(true);
      expect(shootData.data.access.allowDownloads).toBe(true);

      // Step 5: Client views gallery images
      const galleryResponse = await fetch(
        `${shootServiceUrl}/shoots/${shootId}/gallery`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      expect(galleryResponse.status).toBe(200);
      const gallery = await galleryResponse.json();

      expect(gallery.data).toHaveProperty('images');
      expect(gallery.data.metadata.allowDownloads).toBe(true);

      // Step 6: Client downloads a photo
      const imageId = 'file-001';
      const downloadResponse = await fetch(
        `${fileServiceUrl}/files/${shootId}/${imageId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers.get('content-type')).toMatch(/image/);
    });
  });

  describe('Alternate Path: Expired Magic Link', () => {
    it('should deny access with expired magic link', async () => {
      // Create invitation with past expiration
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      const createInviteResponse = await fetch(`${inviteServiceUrl}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shootId,
          clientEmail: 'expired.test@example.com',
          expiresAt: pastDate.toISOString()
        })
      });

      const invitation = await createInviteResponse.json();
      const expiredToken = invitation.data.magicLinkToken;

      // Try to validate expired token
      const validateResponse = await fetch(`${inviteServiceUrl}/magic-links/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: expiredToken,
          shootId
        })
      });

      expect(validateResponse.status).toBe(401);
      const error = await validateResponse.json();
      expect(error.message).toContain('expired');
    });
  });

  describe('Alternate Path: Expired Shoot Access', () => {
    it('should deny access to expired shoot', async () => {
      // Create shoot with expired access
      const expiredShootResponse = await fetch(`${shootServiceUrl}/shoots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographerId: 'photographer-123',
          category: 'portraits',
          title: 'Expired Access Test',
          clientEmail: 'expired.shoot@example.com',
          scheduledDate: '2024-05-01',
          'access.allowClientAccess': true,
          'access.expiresAt': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        })
      });

      const expiredShoot = await expiredShootResponse.json();
      const expiredReference = expiredShoot.data.reference;

      // Try to access expired shoot
      const accessResponse = await fetch(
        `${shootServiceUrl}/shoots/by-ref/${expiredReference}`
      );

      expect(accessResponse.status).toBe(403);
      const error = await accessResponse.json();
      expect(error.message).toContain('expired');
    });
  });

  describe('Alternate Path: Downloads Disabled', () => {
    it('should prevent downloads when disabled', async () => {
      // Create shoot with downloads disabled
      const noDownloadShootResponse = await fetch(`${shootServiceUrl}/shoots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographerId: 'photographer-123',
          category: 'corporate',
          title: 'No Download Test',
          clientEmail: 'nodownload@example.com',
          scheduledDate: '2024-09-15',
          'access.allowClientAccess': true,
          'access.allowDownloads': false  // Downloads disabled
        })
      });

      const noDownloadShoot = await noDownloadShootResponse.json();
      const noDownloadShootId = noDownloadShoot.data.id;

      // Create magic link and get access
      const inviteResponse = await fetch(`${inviteServiceUrl}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shootId: noDownloadShootId,
          clientEmail: 'nodownload@example.com'
        })
      });

      const invite = await inviteResponse.json();

      const validateResponse = await fetch(`${inviteServiceUrl}/magic-links/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: invite.data.magicLinkToken,
          shootId: noDownloadShootId
        })
      });

      const auth = await validateResponse.json();
      const token = auth.data.accessToken;

      // Try to download (should fail)
      const downloadResponse = await fetch(
        `${fileServiceUrl}/files/${noDownloadShootId}/file-001/download`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      expect(downloadResponse.status).toBe(403);
      const error = await downloadResponse.json();
      expect(error.message).toContain('Downloads not allowed');
    });
  });

  describe('Alternate Path: Invalid Shoot Reference', () => {
    it('should return 404 for invalid reference', async () => {
      const invalidReference = 'non-existent-shoot-ref';

      const accessResponse = await fetch(
        `${shootServiceUrl}/shoots/by-ref/${invalidReference}`
      );

      expect(accessResponse.status).toBe(404);
      const error = await accessResponse.json();
      expect(error.message).toContain('not found');
    });
  });

  describe('Alternate Path: Client Access Disabled', () => {
    it('should deny access when client access is disabled', async () => {
      // Create shoot with client access disabled
      const noAccessShootResponse = await fetch(`${shootServiceUrl}/shoots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographerId: 'photographer-123',
          category: 'landscapes',
          title: 'No Client Access Test',
          clientEmail: 'noaccess@example.com',
          scheduledDate: '2024-10-01',
          'access.allowClientAccess': false  // Access disabled
        })
      });

      const noAccessShoot = await noAccessShootResponse.json();
      const noAccessReference = noAccessShoot.data.reference;

      // Try to access
      const accessResponse = await fetch(
        `${shootServiceUrl}/shoots/by-ref/${noAccessReference}`
      );

      expect(accessResponse.status).toBe(403);
      const error = await accessResponse.json();
      expect(error.message).toContain('Client access not enabled');
    });
  });
});
