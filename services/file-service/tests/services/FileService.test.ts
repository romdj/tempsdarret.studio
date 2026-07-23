/**
 * FileService Test Suite
 * Comprehensive testing for file operations including sidecar files
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';
import { FileService } from '../../src/services/FileService.js';
import { StorageService } from '../../src/services/StorageService.js';
import { ProcessingService } from '../../src/services/ProcessingService.js';
import { EventEmitter } from '../../src/services/EventEmitter.js';
import { FileModel, FileType } from '../../src/shared/contracts/files.api.js';
import { Model } from 'mongoose';

// Mock dependencies. The model is a constructor (`new this.fileModel(...)`),
// so it must be a `vi.fn()` with the static query methods attached.
const mockFileModel = vi.fn() as any;
mockFileModel.findById = vi.fn();
mockFileModel.find = vi.fn();
mockFileModel.countDocuments = vi.fn();
mockFileModel.updateOne = vi.fn();
mockFileModel.deleteOne = vi.fn();

// Build a persisted file document mock whose `save()` resolves to itself,
// mirroring Mongoose. Includes timestamps so `transformFileDocument` works.
function buildSavedFileDoc(overrides: Record<string, unknown>): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    _id: 'file123',
    filename: 'test.jpg',
    shootId: 'shoot123',
    size: 0,
    mimeType: 'image/jpeg',
    storagePath: '/2024/01/test-file.jpg',
    processingStatus: 'pending',
    photographerOnly: false,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  doc.save = vi.fn().mockResolvedValue(doc);
  return doc;
}

const mockStorageService = {
  storeFile: vi.fn(),
  getFileStats: vi.fn(),
  deleteFile: vi.fn(),
  deleteChunks: vi.fn(),
  shouldUseChunking: vi.fn(),
  createChunksForFile: vi.fn(),
  createReadStream: vi.fn(),
  createChunkedReadStream: vi.fn(),
} as Mocked<StorageService>;

const mockProcessingService = {
  processFile: vi.fn(),
} as Mocked<ProcessingService>;

const mockEventEmitter = {
  emitFileUploaded: vi.fn(),
  emitFileProcessed: vi.fn(),
  emitFileDeleted: vi.fn(),
} as Mocked<EventEmitter>;

describe('FileService', () => {
  let fileService: FileService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    fileService = new FileService(
      mockFileModel as Model<any>,
      mockStorageService,
      mockProcessingService,
      mockEventEmitter
    );

    // Default mock implementations
    mockStorageService.storeFile.mockResolvedValue('/2024/01/test-file.jpg');
    mockStorageService.getFileStats.mockResolvedValue({ size: 1024, exists: true });
    mockProcessingService.processFile.mockResolvedValue({} as any);
    mockEventEmitter.emitFileUploaded.mockResolvedValue();
  });

  describe('uploadFile', () => {
    const mockFileData = {
      fileData: Buffer.from('test file content'),
      originalName: 'test.jpg',
      mimeType: 'image/jpeg',
      shootId: 'shoot123',
      tags: ['portrait', 'wedding'],
    };

    it('should upload a JPEG file successfully', async () => {
      const mockSavedDoc = buildSavedFileDoc({
        type: 'jpeg',
        size: mockFileData.fileData.length,
        photographerOnly: false,
      });

      // Mock the model constructor and save
      mockFileModel.mockImplementation(() => mockSavedDoc);

      const result = await fileService.uploadFile(mockFileData);

      expect(mockStorageService.storeFile).toHaveBeenCalledWith(
        expect.any(String),
        mockFileData.fileData,
        mockFileData.originalName
      );
      expect(mockEventEmitter.emitFileUploaded).toHaveBeenCalled();
      expect(result.type).toBe('jpeg');
      expect(result.photographerOnly).toBe(false);
    });

    it('should handle RAW file upload correctly', async () => {
      const rawFileData = {
        ...mockFileData,
        originalName: 'IMG_001.CR2',
        mimeType: 'image/x-canon-cr2',
      };

      const mockSavedDoc = buildSavedFileDoc({ type: 'raw' });

      mockFileModel.mockImplementation(() => mockSavedDoc);

      const result = await fileService.uploadFile(rawFileData);

      expect(result.type).toBe('raw');
    });

    it('should handle XMP sidecar file as photographer-only', async () => {
      const xmpFileData = {
        ...mockFileData,
        originalName: 'IMG_001.xmp',
        mimeType: 'application/xml',
      };

      const mockSavedDoc = buildSavedFileDoc({
        type: 'sidecar',
        photographerOnly: true,
        sidecarType: 'xmp',
      });

      mockFileModel.mockImplementation(() => mockSavedDoc);

      const result = await fileService.uploadFile(xmpFileData);

      expect(result.type).toBe('sidecar');
      expect(result.photographerOnly).toBe(true);
      expect(result.sidecarType).toBe('xmp');
    });

    it('should handle Photoshop PSD file as config file', async () => {
      const psdFileData = {
        ...mockFileData,
        originalName: 'edited_image.psd',
        mimeType: 'image/vnd.adobe.photoshop',
      };

      const mockSavedDoc = buildSavedFileDoc({
        type: 'config',
        photographerOnly: true,
        sidecarType: 'psd',
      });

      mockFileModel.mockImplementation(() => mockSavedDoc);

      const result = await fileService.uploadFile(psdFileData);

      expect(result.type).toBe('config');
      expect(result.photographerOnly).toBe(true);
      expect(result.sidecarType).toBe('psd');
    });

    it('should handle all major RAW formats', async () => {
      const rawFormats = [
        { ext: 'cr2', mime: 'image/x-canon-cr2' }, // Canon
        { ext: 'cr3', mime: 'image/x-canon-cr3' }, // Canon
        { ext: 'nef', mime: 'image/x-nikon-nef' }, // Nikon
        { ext: 'arw', mime: 'image/x-sony-arw' }, // Sony
        { ext: 'orf', mime: 'image/x-olympus-orf' }, // Olympus
        { ext: 'dng', mime: 'image/x-adobe-dng' }, // Leica/Adobe
        { ext: '3fr', mime: 'image/x-hasselblad-3fr' }, // Hasselblad
        { ext: 'iiq', mime: 'image/x-phaseone-iiq' }, // Phase One
      ];

      for (const format of rawFormats) {
        const rawFileData = {
          ...mockFileData,
          originalName: `IMG_001.${format.ext.toUpperCase()}`,
          mimeType: format.mime,
        };

        const mockSavedDoc = buildSavedFileDoc({ type: 'raw' });

        mockFileModel.mockImplementation(() => mockSavedDoc);

        const result = await fileService.uploadFile(rawFileData);
        expect(result.type).toBe('raw');
      }
    });

    it('should handle all sidecar/config formats', async () => {
      const sidecarFormats = [
        { ext: 'xmp', type: 'sidecar' }, // Adobe Lightroom/Photoshop
        { ext: 'psd', type: 'config' }, // Adobe Photoshop
        { ext: 'psb', type: 'config' }, // Adobe Photoshop Large
        { ext: 'cos', type: 'config' }, // Capture One
        { ext: 'col', type: 'config' }, // Capture One
        { ext: 'afphoto', type: 'config' }, // Affinity Photo
        { ext: 'xcf', type: 'config' }, // GIMP
      ];

      for (const format of sidecarFormats) {
        const sidecarFileData = {
          ...mockFileData,
          originalName: `project.${format.ext}`,
          mimeType: 'application/octet-stream',
        };

        const mockSavedDoc = buildSavedFileDoc({
          type: format.type,
          photographerOnly: true,
          sidecarType: format.ext,
        });

        mockFileModel.mockImplementation(() => mockSavedDoc);

        const result = await fileService.uploadFile(sidecarFileData);
        expect(result.type).toBe(format.type);
        expect(result.photographerOnly).toBe(true);
        expect(result.sidecarType).toBe(format.ext);
      }
    });
  });

  describe('listFiles', () => {
    it('should filter by photographer-only files', async () => {
      const mockQuery = {
        shootId: 'shoot123',
        photographerOnly: true,
      };

      mockFileModel.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      
      mockFileModel.countDocuments.mockResolvedValue(0);

      await fileService.listFiles(mockQuery);

      expect(mockFileModel.find).toHaveBeenCalledWith({
        shootId: 'shoot123',
        photographerOnly: true,
      });
    });

    it('should filter by file types including sidecar/config', async () => {
      const mockQuery = {
        type: 'sidecar' as FileType,
      };

      mockFileModel.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      
      mockFileModel.countDocuments.mockResolvedValue(0);

      await fileService.listFiles(mockQuery);

      expect(mockFileModel.find).toHaveBeenCalledWith({
        type: 'sidecar',
      });
    });
  });

  describe('createDownloadStream', () => {
    it('should use chunked stream for large files', async () => {
      const fileId = 'file123';
      const mockFile: FileModel = {
        id: fileId,
        filename: 'large_file.jpg',
        type: 'jpeg',
        size: 50 * 1024 * 1024, // 50MB
        storagePath: '/path/to/file.jpg',
        shootId: 'shoot123',
        mimeType: 'image/jpeg',
        processingStatus: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Mock getFileById to return the file
      vi.spyOn(fileService, 'getFileById').mockResolvedValue(mockFile);

      // Report the file's real (large) size so chunking is chosen
      mockStorageService.getFileStats.mockResolvedValue({
        size: mockFile.size,
        exists: true,
      });

      // Mock large file handling
      mockStorageService.shouldUseChunking.mockReturnValue(true);
      mockStorageService.createChunkedReadStream.mockResolvedValue({} as any);

      await fileService.createDownloadStream(fileId);

      expect(mockStorageService.shouldUseChunking).toHaveBeenCalledWith(50 * 1024 * 1024);
      expect(mockStorageService.createChunksForFile).toHaveBeenCalledWith(fileId, mockFile.storagePath);
      expect(mockStorageService.createChunkedReadStream).toHaveBeenCalled();
    });

    it('should use direct stream for small files', async () => {
      const fileId = 'file123';
      const mockFile: FileModel = {
        id: fileId,
        filename: 'small_file.jpg',
        type: 'jpeg',
        size: 1024, // 1KB
        storagePath: '/path/to/file.jpg',
        shootId: 'shoot123',
        mimeType: 'image/jpeg',
        processingStatus: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(fileService, 'getFileById').mockResolvedValue(mockFile);
      
      mockStorageService.shouldUseChunking.mockReturnValue(false);
      mockStorageService.createReadStream.mockReturnValue({} as any);

      await fileService.createDownloadStream(fileId);

      expect(mockStorageService.shouldUseChunking).toHaveBeenCalledWith(1024);
      expect(mockStorageService.createReadStream).toHaveBeenCalledWith(mockFile.storagePath, undefined);
    });
  });

  describe('deleteFile', () => {
    it('should delete file and emit event', async () => {
      const fileId = 'file123';
      const mockFile: FileModel = {
        id: fileId,
        filename: 'test.jpg',
        type: 'jpeg',
        size: 1024,
        storagePath: '/path/to/file.jpg',
        shootId: 'shoot123',
        mimeType: 'image/jpeg',
        processingStatus: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFileModel.findById.mockResolvedValue(mockFile);
      mockStorageService.deleteFile.mockResolvedValue();
      mockStorageService.deleteChunks.mockResolvedValue();
      mockFileModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await fileService.deleteFile(fileId);

      expect(result).toBe(true);
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(mockFile.storagePath);
      expect(mockStorageService.deleteChunks).toHaveBeenCalledWith(fileId);
      expect(mockEventEmitter.emitFileDeleted).toHaveBeenCalled();
    });

    it('should return false for non-existent file', async () => {
      mockFileModel.findById.mockResolvedValue(null);

      const result = await fileService.deleteFile('nonexistent');

      expect(result).toBe(false);
      expect(mockStorageService.deleteFile).not.toHaveBeenCalled();
      expect(mockEventEmitter.emitFileDeleted).not.toHaveBeenCalled();
    });
  });
});