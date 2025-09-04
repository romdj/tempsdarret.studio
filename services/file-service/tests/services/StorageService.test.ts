/**
 * StorageService Test Suite
 * Testing ADR-027 hybrid storage implementation
 */

import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { StorageService, StorageConfig } from '../../src/services/StorageService.js';
import { Model } from 'mongoose';

// Mock fs operations
jest.mock('fs/promises');
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockCreateReadStream = createReadStream as jest.MockedFunction<typeof createReadStream>;
const mockCreateWriteStream = createWriteStream as jest.MockedFunction<typeof createWriteStream>;

// Mock chunk model
const mockChunkModel = {
  countDocuments: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  insertMany: jest.fn(),
  deleteMany: jest.fn(),
} as any;

describe('StorageService', () => {
  let storageService: StorageService;
  let config: StorageConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      basePath: '/data/files',
      chunkSize: 255 * 1024, // 255KB
      largeFileThreshold: 25 * 1024 * 1024, // 25MB
      chunkTTLHours: 24,
    };

    storageService = new StorageService(config, mockChunkModel as Model<any>);
  });

  describe('storeFile', () => {
    it('should store file with generated path', async () => {
      const fileId = 'file123';
      const data = Buffer.from('test file content');
      const originalName = 'test.jpg';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();

      const storagePath = await storageService.storeFile(fileId, data, originalName);

      expect(storagePath).toMatch(/^\d{4}\/\d{2}\/file123\.jpg$/);
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('/data/files/'),
        { recursive: true }
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(`${fileId}.jpg`),
        data
      );
    });

    it('should handle different file extensions', async () => {
      const testCases = [
        { name: 'image.cr2', expected: '.cr2' },
        { name: 'document.pdf', expected: '.pdf' },
        { name: 'noextension', expected: '.bin' },
      ];

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();

      for (const testCase of testCases) {
        const storagePath = await storageService.storeFile('fileId', Buffer.from('test'), testCase.name);
        expect(storagePath).toContain(`fileId${testCase.expected}`);
      }
    });
  });

  describe('getFileStats', () => {
    it('should return file stats for existing file', async () => {
      const storagePath = '2024/01/file123.jpg';
      const mockStats = { size: 1024 };

      mockFs.stat.mockResolvedValue(mockStats as any);

      const stats = await storageService.getFileStats(storagePath);

      expect(stats).toEqual({
        size: 1024,
        exists: true,
      });
      expect(mockFs.stat).toHaveBeenCalledWith('/data/files/2024/01/file123.jpg');
    });

    it('should return non-existent stats for missing file', async () => {
      const storagePath = '2024/01/missing.jpg';

      mockFs.stat.mockRejectedValue(new Error('File not found'));

      const stats = await storageService.getFileStats(storagePath);

      expect(stats).toEqual({
        size: 0,
        exists: false,
      });
    });
  });

  describe('shouldUseChunking', () => {
    it('should return true for large files (>= 25MB)', () => {
      const largeFileSize = 25 * 1024 * 1024; // 25MB
      expect(storageService.shouldUseChunking(largeFileSize)).toBe(true);
    });

    it('should return false for small files (< 25MB)', () => {
      const smallFileSize = 24 * 1024 * 1024; // 24MB
      expect(storageService.shouldUseChunking(smallFileSize)).toBe(false);
    });

    it('should handle edge case exactly at threshold', () => {
      const exactThreshold = config.largeFileThreshold;
      expect(storageService.shouldUseChunking(exactThreshold)).toBe(true);
    });
  });

  describe('createChunksForFile', () => {
    it('should skip chunking for small files', async () => {
      const fileId = 'file123';
      const storagePath = '2024/01/file123.jpg';
      const smallFileSize = 1024; // 1KB

      mockFs.stat.mockResolvedValue({ size: smallFileSize } as any);

      await storageService.createChunksForFile(fileId, storagePath);

      expect(mockChunkModel.countDocuments).not.toHaveBeenCalled();
      expect(mockChunkModel.insertMany).not.toHaveBeenCalled();
    });

    it('should skip if chunks already exist', async () => {
      const fileId = 'file123';
      const storagePath = '2024/01/file123.jpg';
      const largeFileSize = 50 * 1024 * 1024; // 50MB

      mockFs.stat.mockResolvedValue({ size: largeFileSize } as any);
      mockChunkModel.countDocuments.mockResolvedValue(100); // Chunks exist

      await storageService.createChunksForFile(fileId, storagePath);

      expect(mockChunkModel.countDocuments).toHaveBeenCalledWith({ fileId });
      expect(mockFs.open).not.toHaveBeenCalled();
    });

    it('should create chunks for large files', async () => {
      const fileId = 'file123';
      const storagePath = '2024/01/file123.jpg';
      const largeFileSize = 50 * 1024 * 1024; // 50MB
      const expectedChunks = Math.ceil(largeFileSize / config.chunkSize);

      const mockFileHandle = {
        read: jest.fn().mockImplementation(async (buffer, offset, length, position) => {
          // Mock reading chunk data
          return { bytesRead: length };
        }),
        close: jest.fn(),
      };

      mockFs.stat.mockResolvedValue({ size: largeFileSize } as any);
      mockChunkModel.countDocuments.mockResolvedValue(0); // No existing chunks
      mockFs.open.mockResolvedValue(mockFileHandle as any);
      mockChunkModel.insertMany.mockResolvedValue([]);

      await storageService.createChunksForFile(fileId, storagePath);

      expect(mockFs.open).toHaveBeenCalledWith('/data/files/2024/01/file123.jpg', 'r');
      expect(mockFileHandle.read).toHaveBeenCalledTimes(expectedChunks);
      expect(mockFileHandle.close).toHaveBeenCalled();

      // Verify chunks are created in batches
      const insertCalls = mockChunkModel.insertMany.mock.calls;
      expect(insertCalls.length).toBeGreaterThan(0);
    });
  });

  describe('getChunk', () => {
    it('should return chunk data when found', async () => {
      const fileId = 'file123';
      const chunkIndex = 0;
      const mockChunkData = Buffer.from('chunk data');

      mockChunkModel.findOne.mockResolvedValue({
        data: mockChunkData,
      });

      const result = await storageService.getChunk(fileId, chunkIndex);

      expect(result).toBe(mockChunkData);
      expect(mockChunkModel.findOne).toHaveBeenCalledWith({ fileId, chunkIndex });
    });

    it('should return null when chunk not found', async () => {
      const fileId = 'file123';
      const chunkIndex = 0;

      mockChunkModel.findOne.mockResolvedValue(null);

      const result = await storageService.getChunk(fileId, chunkIndex);

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredChunks', () => {
    it('should delete expired chunks and return count', async () => {
      const deletedCount = 42;
      mockChunkModel.deleteMany.mockResolvedValue({ deletedCount });

      const result = await storageService.cleanupExpiredChunks();

      expect(result).toBe(deletedCount);
      expect(mockChunkModel.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) }
      });
    });

    it('should handle no deleted chunks', async () => {
      mockChunkModel.deleteMany.mockResolvedValue({ deletedCount: 0 });

      const result = await storageService.cleanupExpiredChunks();

      expect(result).toBe(0);
    });
  });

  describe('createReadStream', () => {
    it('should create read stream with options', () => {
      const storagePath = '2024/01/file123.jpg';
      const options = { start: 0, end: 1023 };
      const mockStream = {} as any;

      mockCreateReadStream.mockReturnValue(mockStream);

      const result = storageService.createReadStream(storagePath, options);

      expect(result).toBe(mockStream);
      expect(mockCreateReadStream).toHaveBeenCalledWith(
        '/data/files/2024/01/file123.jpg',
        options
      );
    });

    it('should create read stream without options', () => {
      const storagePath = '2024/01/file123.jpg';
      const mockStream = {} as any;

      mockCreateReadStream.mockReturnValue(mockStream);

      const result = storageService.createReadStream(storagePath);

      expect(result).toBe(mockStream);
      expect(mockCreateReadStream).toHaveBeenCalledWith(
        '/data/files/2024/01/file123.jpg',
        undefined
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const storagePath = '2024/01/file123.jpg';

      mockFs.unlink.mockResolvedValue();

      await storageService.deleteFile(storagePath);

      expect(mockFs.unlink).toHaveBeenCalledWith('/data/files/2024/01/file123.jpg');
    });

    it('should handle file deletion errors gracefully', async () => {
      const storagePath = '2024/01/file123.jpg';

      mockFs.unlink.mockRejectedValue(new Error('File not found'));

      // Should not throw
      await expect(storageService.deleteFile(storagePath)).resolves.toBeUndefined();
    });
  });

  describe('deleteChunks', () => {
    it('should delete all chunks for a file', async () => {
      const fileId = 'file123';

      mockChunkModel.deleteMany.mockResolvedValue({ deletedCount: 100 });

      await storageService.deleteChunks(fileId);

      expect(mockChunkModel.deleteMany).toHaveBeenCalledWith({ fileId });
    });
  });

  describe('generateStoragePath (private method tested via storeFile)', () => {
    it('should generate paths with current year/month', async () => {
      const fileId = 'file123';
      const originalName = 'test.jpg';
      const now = new Date();
      const expectedYear = now.getFullYear();
      const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();

      const storagePath = await storageService.storeFile(fileId, Buffer.from('test'), originalName);

      expect(storagePath).toBe(`${expectedYear}/${expectedMonth}/${fileId}.jpg`);
    });
  });

  describe('ensureStorageDirectory', () => {
    it('should create base storage directory', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);

      await storageService.ensureStorageDirectory();

      expect(mockFs.mkdir).toHaveBeenCalledWith(config.basePath, { recursive: true });
    });
  });
});