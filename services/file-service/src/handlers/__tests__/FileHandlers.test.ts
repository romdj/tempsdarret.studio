/**
 * FileHandlers Test Suite
 * Testing ADR-026 download progress compliance and HTTP handlers
 */

import { FileHandlers } from '../FileHandlers.js';
import { FileService } from '../../services/FileService.js';
import { ArchiveService } from '../../services/ArchiveService.js';
import { FileModel } from '../../shared/contracts/files.api.js';

// Mock services
const mockFileService = {
  uploadFile: jest.fn(),
  listFiles: jest.fn(),
  getFileById: jest.fn(),
  deleteFile: jest.fn(),
  getFileStats: jest.fn(),
  createDownloadStream: jest.fn(),
} as jest.Mocked<FileService>;

const mockArchiveService = {
  createArchive: jest.fn(),
  getArchiveById: jest.fn(),
  createArchiveDownloadStream: jest.fn(),
} as jest.Mocked<ArchiveService>;

// Mock Fastify request/reply
const createMockRequest = (params?: any, query?: any, body?: any, headers?: any) => ({
  params: params || {},
  query: query || {},
  body: body || {},
  headers: headers || {},
});

const createMockReply = () => {
  const reply = {
    code: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return reply;
};

describe('FileHandlers', () => {
  let fileHandlers: FileHandlers;

  beforeEach(() => {
    jest.clearAllMocks();
    fileHandlers = new FileHandlers(mockFileService, mockArchiveService);
  });

  describe('downloadFile (ADR-026 compliance)', () => {
    const mockFile: FileModel = {
      id: 'file123',
      filename: 'test.jpg',
      type: 'jpeg',
      size: 1024 * 1024, // 1MB
      mimeType: 'image/jpeg',
      storagePath: '2024/01/file123.jpg',
      shootId: 'shoot123',
      processingStatus: 'completed',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should include Content-Length header for progress bars (ADR-026)', async () => {
      const request = createMockRequest({ fileId: 'file123' });
      const reply = createMockReply();

      mockFileService.getFileById.mockResolvedValue(mockFile);
      mockFileService.getFileStats.mockResolvedValue({
        size: mockFile.size,
        exists: true,
      });
      mockFileService.createDownloadStream.mockResolvedValue({} as any);

      await fileHandlers.downloadFile(request as any, reply as any);

      // Verify ADR-026 compliance: Content-Length header MUST be set
      expect(reply.header).toHaveBeenCalledWith('Content-Length', mockFile.size.toString());
      expect(reply.header).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(reply.header).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test.jpg"');
      expect(reply.header).toHaveBeenCalledWith('Accept-Ranges', 'bytes');
      expect(reply.header).toHaveBeenCalledWith('Cache-Control', 'private, max-age=0');
    });

    it('should handle range requests for resumable downloads (ADR-026)', async () => {
      const request = createMockRequest(
        { fileId: 'file123' },
        {},
        {},
        { range: 'bytes=0-1023' }
      );
      const reply = createMockReply();

      mockFileService.getFileById.mockResolvedValue(mockFile);
      mockFileService.getFileStats.mockResolvedValue({
        size: mockFile.size,
        exists: true,
      });
      mockFileService.createDownloadStream.mockResolvedValue({} as any);

      await fileHandlers.downloadFile(request as any, reply as any);

      // Verify partial content response
      expect(reply.code).toHaveBeenCalledWith(206);
      expect(reply.header).toHaveBeenCalledWith('Content-Range', `bytes 0-1023/${mockFile.size}`);
      expect(reply.header).toHaveBeenCalledWith('Content-Length', '1024');
      expect(mockFileService.createDownloadStream).toHaveBeenCalledWith('file123', {
        start: 0,
        end: 1023,
      });
    });

    it('should handle large file downloads with correct headers', async () => {
      const largeFile: FileModel = {
        ...mockFile,
        size: 50 * 1024 * 1024 * 1024, // 50GB
      };

      const request = createMockRequest({ fileId: 'file123' });
      const reply = createMockReply();

      mockFileService.getFileById.mockResolvedValue(largeFile);
      mockFileService.getFileStats.mockResolvedValue({
        size: largeFile.size,
        exists: true,
      });
      mockFileService.createDownloadStream.mockResolvedValue({} as any);

      await fileHandlers.downloadFile(request as any, reply as any);

      // Verify large file gets proper Content-Length for progress (ADR-026)
      expect(reply.header).toHaveBeenCalledWith('Content-Length', largeFile.size.toString());
      expect(reply.code).toHaveBeenCalledWith(200);
    });

    it('should return 404 for non-existent file', async () => {
      const request = createMockRequest({ fileId: 'nonexistent' });
      const reply = createMockReply();

      mockFileService.getFileById.mockResolvedValue(null);

      await fileHandlers.downloadFile(request as any, reply as any);

      expect(reply.code).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
        },
      });
    });

    it('should return 404 when file data missing on storage', async () => {
      const request = createMockRequest({ fileId: 'file123' });
      const reply = createMockReply();

      mockFileService.getFileById.mockResolvedValue(mockFile);
      mockFileService.getFileStats.mockResolvedValue({
        size: 0,
        exists: false,
      });

      await fileHandlers.downloadFile(request as any, reply as any);

      expect(reply.code).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FILE_DATA_NOT_FOUND',
          message: 'File data not found on storage',
        },
      });
    });

    it('should handle download errors gracefully', async () => {
      const request = createMockRequest({ fileId: 'file123' });
      const reply = createMockReply();

      mockFileService.getFileById.mockRejectedValue(new Error('Database error'));

      await fileHandlers.downloadFile(request as any, reply as any);

      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: 'Database error',
        },
      });
    });
  });

  describe('downloadArchive (ADR-026 compliance)', () => {
    const mockArchive = {
      id: 'archive123',
      shootId: 'shoot123',
      type: 'complete' as const,
      size: 500 * 1024 * 1024, // 500MB
      downloadUrl: '/archives/archive123/download',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      status: 'completed' as const,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should include Content-Length header for archive downloads (ADR-026)', async () => {
      const request = createMockRequest({ archiveId: 'archive123' });
      const reply = createMockReply();

      mockArchiveService.getArchiveById.mockResolvedValue(mockArchive);
      mockArchiveService.createArchiveDownloadStream.mockResolvedValue({} as any);

      await fileHandlers.downloadArchive(request as any, reply as any);

      // Verify ADR-026 compliance for archives
      expect(reply.header).toHaveBeenCalledWith('Content-Length', mockArchive.size.toString());
      expect(reply.header).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(reply.header).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="archive_archive123.zip"');
      expect(reply.header).toHaveBeenCalledWith('Accept-Ranges', 'bytes');
      expect(reply.header).toHaveBeenCalledWith('Cache-Control', 'private, max-age=0');
    });

    it('should return 404 for non-existent archive', async () => {
      const request = createMockRequest({ archiveId: 'nonexistent' });
      const reply = createMockReply();

      mockArchiveService.getArchiveById.mockResolvedValue(null);

      await fileHandlers.downloadArchive(request as any, reply as any);

      expect(reply.code).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ARCHIVE_NOT_READY',
          message: 'Archive not found or not ready for download',
        },
      });
    });

    it('should return 410 for expired archive', async () => {
      const expiredArchive = {
        ...mockArchive,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired 24 hours ago
      };

      const request = createMockRequest({ archiveId: 'archive123' });
      const reply = createMockReply();

      mockArchiveService.getArchiveById.mockResolvedValue(expiredArchive);

      await fileHandlers.downloadArchive(request as any, reply as any);

      expect(reply.code).toHaveBeenCalledWith(410);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ARCHIVE_EXPIRED',
          message: 'Archive has expired',
        },
      });
    });

    it('should return 404 for non-completed archive', async () => {
      const processingArchive = {
        ...mockArchive,
        status: 'processing' as const,
      };

      const request = createMockRequest({ archiveId: 'archive123' });
      const reply = createMockReply();

      mockArchiveService.getArchiveById.mockResolvedValue(processingArchive);

      await fileHandlers.downloadArchive(request as any, reply as any);

      expect(reply.code).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ARCHIVE_NOT_READY',
          message: 'Archive not found or not ready for download',
        },
      });
    });
  });

  describe('uploadFile', () => {
    it('should handle file upload successfully', async () => {
      const mockUploadData = {
        file: {
          data: Buffer.from('test file content'),
          filename: 'test.jpg',
          mimetype: 'image/jpeg',
        },
        shootId: 'shoot123',
        tags: ['portrait'],
      };

      const request = createMockRequest({}, {}, mockUploadData);
      const reply = createMockReply();

      const mockUploadedFile: FileModel = {
        id: 'file123',
        filename: 'test.jpg',
        type: 'jpeg',
        size: mockUploadData.file.data.length,
        mimeType: 'image/jpeg',
        storagePath: '2024/01/file123.jpg',
        shootId: 'shoot123',
        processingStatus: 'pending',
        tags: ['portrait'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFileService.uploadFile.mockResolvedValue(mockUploadedFile);

      const result = await fileHandlers.uploadFile(request as any, reply as any);

      expect(mockFileService.uploadFile).toHaveBeenCalledWith({
        fileData: mockUploadData.file.data,
        originalName: mockUploadData.file.filename,
        mimeType: mockUploadData.file.mimetype,
        shootId: mockUploadData.shootId,
        tags: mockUploadData.tags,
      });

      expect(result).toEqual({
        success: true,
        data: mockUploadedFile,
      });
    });

    it('should handle sidecar file upload', async () => {
      const mockSidecarData = {
        file: {
          data: Buffer.from('<?xml version="1.0"?>'),
          filename: 'IMG_001.xmp',
          mimetype: 'application/xml',
        },
        shootId: 'shoot123',
      };

      const request = createMockRequest({}, {}, mockSidecarData);
      const reply = createMockReply();

      const mockSidecarFile: FileModel = {
        id: 'file123',
        filename: 'IMG_001.xmp',
        type: 'sidecar',
        size: mockSidecarData.file.data.length,
        mimeType: 'application/xml',
        storagePath: '2024/01/file123.xmp',
        shootId: 'shoot123',
        processingStatus: 'pending',
        photographerOnly: true,
        sidecarType: 'xmp',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFileService.uploadFile.mockResolvedValue(mockSidecarFile);

      const result = await fileHandlers.uploadFile(request as any, reply as any);

      expect(result).toEqual({
        success: true,
        data: mockSidecarFile,
      });
    });

    it('should handle upload validation errors', async () => {
      const invalidUploadData = {
        file: undefined, // Missing file
        shootId: 'shoot123',
      };

      const request = createMockRequest({}, {}, invalidUploadData);
      const reply = createMockReply();

      const result = await fileHandlers.uploadFile(request as any, reply as any);

      expect(result).toEqual({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: 'File data and filename are required',
        },
      });

      expect(mockFileService.uploadFile).not.toHaveBeenCalled();
    });

    it('should handle upload service errors', async () => {
      const mockUploadData = {
        file: {
          data: Buffer.from('test'),
          filename: 'test.jpg',
          mimetype: 'image/jpeg',
        },
        shootId: 'shoot123',
      };

      const request = createMockRequest({}, {}, mockUploadData);
      const reply = createMockReply();

      mockFileService.uploadFile.mockRejectedValue(new Error('Storage error'));

      const result = await fileHandlers.uploadFile(request as any, reply as any);

      expect(result).toEqual({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Storage error',
        },
      });
    });
  });

  describe('listFiles', () => {
    it('should list files with filtering', async () => {
      const request = createMockRequest({}, {
        shootId: 'shoot123',
        type: 'jpeg',
        photographerOnly: false,
      });
      const reply = createMockReply();

      const mockResult = {
        files: [mockFile],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      };

      mockFileService.listFiles.mockResolvedValue(mockResult);

      const result = await fileHandlers.listFiles(request as any, reply as any);

      expect(mockFileService.listFiles).toHaveBeenCalledWith({
        shootId: 'shoot123',
        type: 'jpeg',
        photographerOnly: false,
      });

      expect(result).toEqual({
        success: true,
        data: mockResult.files,
        pagination: mockResult.pagination,
      });
    });

    it('should handle list service errors', async () => {
      const request = createMockRequest({}, {});
      const reply = createMockReply();

      mockFileService.listFiles.mockRejectedValue(new Error('Database error'));

      const result = await fileHandlers.listFiles(request as any, reply as any);

      expect(result).toEqual({
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: 'Database error',
        },
      });
    });
  });
});