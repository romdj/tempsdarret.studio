/**
 * FileService Test Suite
 * Comprehensive testing for file operations including sidecar files
 */

import { FileService } from '../../src/services/FileService.js';
import { StorageService } from '../../src/services/StorageService.js';
import { ProcessingService } from '../../src/services/ProcessingService.js';
import { EventEmitter } from '../../src/services/EventEmitter.js';
import { FileModel, FileType } from '../../src/shared/contracts/files.api.js';
import { Model } from 'mongoose';

// Mock dependencies
const mockFileModel = {
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  prototype: {
    save: jest.fn(),
  }
} as any;

const mockStorageService = {
  storeFile: jest.fn(),
  getFileStats: jest.fn(),
  deleteFile: jest.fn(),
  deleteChunks: jest.fn(),
  shouldUseChunking: jest.fn(),
  createChunksForFile: jest.fn(),
  createReadStream: jest.fn(),
  createChunkedReadStream: jest.fn(),
} as jest.Mocked<StorageService>;

const mockProcessingService = {
  processFile: jest.fn(),
} as jest.Mocked<ProcessingService>;

const mockEventEmitter = {
  emitFileUploaded: jest.fn(),
  emitFileProcessed: jest.fn(),
  emitFileDeleted: jest.fn(),
} as jest.Mocked<EventEmitter>;

describe('FileService', () => {
  let fileService: FileService;

  beforeEach(() => {
    jest.clearAllMocks();
    
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
      const mockSavedDoc = {
        _id: 'file123',
        ...mockFileData,
        type: 'jpeg',
        size: mockFileData.fileData.length,
        storagePath: '/2024/01/test-file.jpg',
        processingStatus: 'pending',
        photographerOnly: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue({
          _id: 'file123',
          toObject: () => ({}),
        }),
      };

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

      const mockSavedDoc = {
        _id: 'file123',
        ...rawFileData,
        type: 'raw',
        save: jest.fn().mockResolvedValue({ _id: 'file123' }),
      };

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

      const mockSavedDoc = {
        _id: 'file123',
        ...xmpFileData,
        type: 'sidecar',
        photographerOnly: true,
        sidecarType: 'xmp',
        save: jest.fn().mockResolvedValue({ _id: 'file123' }),
      };

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

      const mockSavedDoc = {
        _id: 'file123',
        ...psdFileData,
        type: 'config',
        photographerOnly: true,
        sidecarType: 'psd',
        save: jest.fn().mockResolvedValue({ _id: 'file123' }),
      };

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

        const mockSavedDoc = {
          _id: 'file123',
          type: 'raw',
          save: jest.fn().mockResolvedValue({ _id: 'file123' }),
        };

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

        const mockSavedDoc = {
          _id: 'file123',
          type: format.type,
          photographerOnly: true,
          sidecarType: format.ext,
          save: jest.fn().mockResolvedValue({ _id: 'file123' }),
        };

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
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
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
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
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
      jest.spyOn(fileService, 'getFileById').mockResolvedValue(mockFile);
      
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

      jest.spyOn(fileService, 'getFileById').mockResolvedValue(mockFile);
      
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