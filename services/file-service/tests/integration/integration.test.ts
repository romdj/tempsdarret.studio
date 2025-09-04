/**
 * File Service Integration Tests
 * End-to-end testing of complete file service workflow
 */

import request from 'supertest';
import { FastifyInstance } from 'fastify';
import { createServer } from '../../src/server.js';
import { FileModel } from '../../src/shared/contracts/files.api.js';
import fs from 'fs/promises';
import path from 'path';

describe('File Service Integration Tests', () => {
  let app: FastifyInstance;
  let testFiles: Buffer[] = [];

  beforeAll(async () => {
    app = await createServer();
    await app.ready();

    // Create test file buffers
    testFiles = [
      Buffer.from('test jpeg content', 'utf8'), // JPEG
      Buffer.from('<?xml version="1.0"?><x:xmpmeta>', 'utf8'), // XMP sidecar
      Buffer.from('test raw content', 'utf8'), // RAW file
      Buffer.from('test psd content', 'utf8'), // PSD config
    ];
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete file upload and download workflow', () => {
    let uploadedFiles: FileModel[] = [];

    it('should upload multiple file types including sidecar files', async () => {
      const testCases = [
        {
          buffer: testFiles[0],
          filename: 'wedding_photo.jpg',
          mimetype: 'image/jpeg',
          expectedType: 'jpeg',
          photographerOnly: false,
        },
        {
          buffer: testFiles[1],
          filename: 'wedding_photo.xmp',
          mimetype: 'application/xml',
          expectedType: 'sidecar',
          photographerOnly: true,
          expectedSidecarType: 'xmp',
        },
        {
          buffer: testFiles[2],
          filename: 'IMG_001.CR2',
          mimetype: 'image/x-canon-cr2',
          expectedType: 'raw',
          photographerOnly: false,
        },
        {
          buffer: testFiles[3],
          filename: 'edit_project.psd',
          mimetype: 'image/vnd.adobe.photoshop',
          expectedType: 'config',
          photographerOnly: true,
          expectedSidecarType: 'psd',
        },
      ];

      for (const testCase of testCases) {
        const response = await request(app.server)
          .post('/api/files/upload')
          .attach('file', testCase.buffer, testCase.filename)
          .field('shootId', 'integration-test-shoot')
          .field('tags', JSON.stringify(['integration-test']))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.type).toBe(testCase.expectedType);
        expect(response.body.data.filename).toBe(testCase.filename);
        expect(response.body.data.shootId).toBe('integration-test-shoot');
        expect(response.body.data.photographerOnly).toBe(testCase.photographerOnly);

        if (testCase.expectedSidecarType) {
          expect(response.body.data.sidecarType).toBe(testCase.expectedSidecarType);
        }

        uploadedFiles.push(response.body.data);
      }

      expect(uploadedFiles).toHaveLength(4);
    });

    it('should list files with filtering by photographer-only', async () => {
      // List all files
      const allFilesResponse = await request(app.server)
        .get('/api/files')
        .query({ shootId: 'integration-test-shoot' })
        .expect(200);

      expect(allFilesResponse.body.success).toBe(true);
      expect(allFilesResponse.body.data).toHaveLength(4);

      // List only photographer-only files (sidecar + config)
      const photographerOnlyResponse = await request(app.server)
        .get('/api/files')
        .query({ 
          shootId: 'integration-test-shoot',
          photographerOnly: 'true'
        })
        .expect(200);

      expect(photographerOnlyResponse.body.success).toBe(true);
      expect(photographerOnlyResponse.body.data).toHaveLength(2); // XMP + PSD

      const photographerFiles = photographerOnlyResponse.body.data;
      expect(photographerFiles.every((file: FileModel) => file.photographerOnly)).toBe(true);
      
      const fileTypes = photographerFiles.map((file: FileModel) => file.type);
      expect(fileTypes).toContain('sidecar');
      expect(fileTypes).toContain('config');
    });

    it('should filter files by type including sidecar and config', async () => {
      // Test sidecar type filter
      const sidecarResponse = await request(app.server)
        .get('/api/files')
        .query({ 
          shootId: 'integration-test-shoot',
          type: 'sidecar'
        })
        .expect(200);

      expect(sidecarResponse.body.data).toHaveLength(1);
      expect(sidecarResponse.body.data[0].type).toBe('sidecar');
      expect(sidecarResponse.body.data[0].sidecarType).toBe('xmp');

      // Test config type filter
      const configResponse = await request(app.server)
        .get('/api/files')
        .query({ 
          shootId: 'integration-test-shoot',
          type: 'config'
        })
        .expect(200);

      expect(configResponse.body.data).toHaveLength(1);
      expect(configResponse.body.data[0].type).toBe('config');
      expect(configResponse.body.data[0].sidecarType).toBe('psd');
    });

    it('should download files with ADR-026 compliant headers', async () => {
      const fileToDownload = uploadedFiles.find(f => f.type === 'jpeg');
      expect(fileToDownload).toBeDefined();

      const response = await request(app.server)
        .get(`/api/files/${fileToDownload!.id}/download`)
        .expect(200);

      // Verify ADR-026 compliance
      expect(response.headers['content-length']).toBeDefined();
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('wedding_photo.jpg');
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['cache-control']).toBe('private, max-age=0');

      expect(response.body).toEqual(testFiles[0]);
    });

    it('should handle range requests for resumable downloads', async () => {
      const fileToDownload = uploadedFiles.find(f => f.type === 'raw');
      expect(fileToDownload).toBeDefined();

      const response = await request(app.server)
        .get(`/api/files/${fileToDownload!.id}/download`)
        .set('Range', 'bytes=0-4')
        .expect(206);

      // Verify partial content response
      expect(response.headers['content-range']).toContain('bytes 0-4/');
      expect(response.headers['content-length']).toBe('5');
      expect(response.body.toString()).toBe('test '); // First 5 bytes
    });

    it('should handle large file download with chunking', async () => {
      // Create a large test file (>25MB) to test chunking
      const largeBuffer = Buffer.alloc(30 * 1024 * 1024, 'x'); // 30MB file

      const uploadResponse = await request(app.server)
        .post('/api/files/upload')
        .attach('file', largeBuffer, 'large_image.jpg')
        .field('shootId', 'integration-test-shoot')
        .field('tags', JSON.stringify(['large-file']))
        .expect(200);

      const largeFile = uploadResponse.body.data;

      // Download the large file
      const downloadResponse = await request(app.server)
        .get(`/api/files/${largeFile.id}/download`)
        .expect(200);

      // Verify headers are still ADR-026 compliant for large files
      expect(downloadResponse.headers['content-length']).toBe((30 * 1024 * 1024).toString());
      expect(downloadResponse.headers['content-type']).toBe('image/jpeg');
      expect(downloadResponse.headers['accept-ranges']).toBe('bytes');

      // Verify file content integrity
      expect(downloadResponse.body).toEqual(largeBuffer);
    });

    it('should update file metadata and processing status', async () => {
      const fileToUpdate = uploadedFiles.find(f => f.type === 'jpeg');
      expect(fileToUpdate).toBeDefined();

      // Update file metadata
      const updateResponse = await request(app.server)
        .put(`/api/files/${fileToUpdate!.id}`)
        .send({
          tags: ['updated-tag', 'processed'],
          processingStatus: 'completed',
          metadata: {
            processedBy: 'integration-test',
            dimensions: { width: 1920, height: 1080 }
          }
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.tags).toEqual(['updated-tag', 'processed']);
      expect(updateResponse.body.data.processingStatus).toBe('completed');
      expect(updateResponse.body.data.metadata.processedBy).toBe('integration-test');
    });

    it('should delete files and cleanup storage', async () => {
      // Delete each uploaded file
      for (const file of uploadedFiles) {
        const deleteResponse = await request(app.server)
          .delete(`/api/files/${file.id}`)
          .expect(200);

        expect(deleteResponse.body.success).toBe(true);

        // Verify file is no longer accessible
        await request(app.server)
          .get(`/api/files/${file.id}`)
          .expect(404);

        // Verify download no longer works
        await request(app.server)
          .get(`/api/files/${file.id}/download`)
          .expect(404);
      }

      // Verify no files remain in the shoot
      const listResponse = await request(app.server)
        .get('/api/files')
        .query({ shootId: 'integration-test-shoot' })
        .expect(200);

      expect(listResponse.body.data).toHaveLength(0);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle unsupported file types gracefully', async () => {
      const unsupportedFile = Buffer.from('test content', 'utf8');

      const response = await request(app.server)
        .post('/api/files/upload')
        .attach('file', unsupportedFile, 'document.docx')
        .field('shootId', 'test-shoot')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('should validate file size limits', async () => {
      // Test file too large (>100MB)
      const oversizedFile = Buffer.alloc(101 * 1024 * 1024, 'x');

      const response = await request(app.server)
        .post('/api/files/upload')
        .attach('file', oversizedFile, 'huge_file.jpg')
        .field('shootId', 'test-shoot')
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    });

    it('should handle missing file data', async () => {
      const response = await request(app.server)
        .post('/api/files/upload')
        .field('shootId', 'test-shoot')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILE');
    });

    it('should return 404 for non-existent file operations', async () => {
      const nonExistentId = 'non-existent-file-id';

      // Test get file
      await request(app.server)
        .get(`/api/files/${nonExistentId}`)
        .expect(404);

      // Test download
      await request(app.server)
        .get(`/api/files/${nonExistentId}/download`)
        .expect(404);

      // Test update
      await request(app.server)
        .put(`/api/files/${nonExistentId}`)
        .send({ tags: ['test'] })
        .expect(404);

      // Test delete
      await request(app.server)
        .delete(`/api/files/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('Archive functionality integration', () => {
    let testShootFiles: FileModel[] = [];

    beforeEach(async () => {
      // Upload test files for archive creation
      const testFiles = [
        { filename: 'arch_test1.jpg', content: 'jpeg1' },
        { filename: 'arch_test2.jpg', content: 'jpeg2' },
        { filename: 'arch_test.CR2', content: 'raw1' },
        { filename: 'arch_test.xmp', content: 'xmp1' },
      ];

      for (const testFile of testFiles) {
        const response = await request(app.server)
          .post('/api/files/upload')
          .attach('file', Buffer.from(testFile.content), testFile.filename)
          .field('shootId', 'archive-test-shoot')
          .expect(200);

        testShootFiles.push(response.body.data);
      }
    });

    afterEach(async () => {
      // Cleanup
      for (const file of testShootFiles) {
        await request(app.server).delete(`/api/files/${file.id}`);
      }
      testShootFiles = [];
    });

    it('should create and download complete archives', async () => {
      // Create complete archive
      const createResponse = await request(app.server)
        .post('/api/archives')
        .send({
          shootId: 'archive-test-shoot',
          type: 'complete'
        })
        .expect(200);

      const archive = createResponse.body.data;
      expect(archive.type).toBe('complete');
      expect(archive.shootId).toBe('archive-test-shoot');

      // Wait for archive processing to complete
      let archiveReady = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!archiveReady && attempts < maxAttempts) {
        const statusResponse = await request(app.server)
          .get(`/api/archives/${archive.id}`)
          .expect(200);

        if (statusResponse.body.data.status === 'completed') {
          archiveReady = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      expect(archiveReady).toBe(true);

      // Download the archive
      const downloadResponse = await request(app.server)
        .get(`/api/archives/${archive.id}/download`)
        .expect(200);

      // Verify ADR-026 compliance for archive downloads
      expect(downloadResponse.headers['content-length']).toBeDefined();
      expect(downloadResponse.headers['content-type']).toBe('application/zip');
      expect(downloadResponse.headers['content-disposition']).toContain('attachment');
      expect(downloadResponse.headers['accept-ranges']).toBe('bytes');
      expect(downloadResponse.headers['cache-control']).toBe('private, max-age=0');
    });

    it('should create type-specific archives (JPEG only)', async () => {
      const createResponse = await request(app.server)
        .post('/api/archives')
        .send({
          shootId: 'archive-test-shoot',
          type: 'jpeg'
        })
        .expect(200);

      const archive = createResponse.body.data;
      expect(archive.type).toBe('jpeg');

      // Archive should only contain JPEG files, excluding sidecar/config files
      const archiveInfo = await request(app.server)
        .get(`/api/archives/${archive.id}`)
        .expect(200);

      // Size should be smaller than complete archive since it excludes RAW and sidecar files
      expect(archiveInfo.body.data.size).toBeGreaterThan(0);
    });

    it('should handle expired archives properly', async () => {
      // Create archive with short expiration for testing
      const createResponse = await request(app.server)
        .post('/api/archives')
        .send({
          shootId: 'archive-test-shoot',
          type: 'jpeg',
          ttlHours: 0.001 // Very short expiration for testing
        })
        .expect(200);

      const archive = createResponse.body.data;

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to download expired archive
      const downloadResponse = await request(app.server)
        .get(`/api/archives/${archive.id}/download`)
        .expect(410);

      expect(downloadResponse.body.error.code).toBe('ARCHIVE_EXPIRED');
    });
  });
});