/**
 * File Handlers
 * HTTP request handlers implementing ADR-026 download progress requirements
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { FileService } from '../services/FileService.js';
import { ArchiveService } from '../services/ArchiveService.js';
import {
  FileQuery,
  CreateArchiveRequest,
  SuccessResponse,
  PaginatedResponse,
  ApiError,
  FileModel,
  ArchiveModel
} from '../shared/contracts/files.api.js';

export interface FileUploadMultipart {
  file: {
    data: Buffer;
    filename: string;
    mimetype: string;
  };
  shootId: string;
  tags?: string[];
}

export class FileHandlers {
  constructor(
    private readonly fileService: FileService,
    private readonly archiveService: ArchiveService
  ) {}

  /**
   * Upload file handler
   */
  async uploadFile(
    request: FastifyRequest<{ Body: FileUploadMultipart }>,
    _reply: FastifyReply
  ): Promise<SuccessResponse<FileModel> | ApiError> {
    try {
      const { file, shootId, tags } = request.body;

      if (!file.data) {
        return {
          success: false,
          error: {
            code: 'INVALID_FILE',
            message: 'File data and filename are required',
          },
        };
      }

      const fileModel = await this.fileService.uploadFile({
        fileData: file.data,
        originalName: file.filename,
        mimeType: file.mimetype,
        shootId,
        tags,
      });

      return {
        success: true,
        data: fileModel,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload file',
        },
      };
    }
  }

  /**
   * List files with filtering
   */
  async listFiles(
    request: FastifyRequest<{ Querystring: FileQuery }>,
    _reply: FastifyReply
  ): Promise<PaginatedResponse<FileModel> | ApiError> {
    try {
      const query = request.query;
      const result = await this.fileService.listFiles(query);

      return {
        success: true,
        data: result.files,
        pagination: result.pagination,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list files',
        },
      };
    }
  }

  /**
   * Get file by ID
   */
  async getFile(
    request: FastifyRequest<{ Params: { fileId: string } }>,
    _reply: FastifyReply
  ): Promise<SuccessResponse<FileModel> | ApiError> {
    try {
      const { fileId } = request.params;
      const file = await this.fileService.getFileById(fileId);

      if (!file) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
          },
        };
      }

      return {
        success: true,
        data: file,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get file',
        },
      };
    }
  }

  /**
   * Download file with progress support (ADR-026)
   * MUST include Content-Length header for browser progress bars
   *
   * This method handles file downloads with range request support.
   * It retrieves file metadata, validates existence, handles partial content requests,
   * sets appropriate headers for download progress tracking, and streams the file data.
   */
  /* eslint-disable max-lines-per-function */
  async downloadFile(
    request: FastifyRequest<{ Params: { fileId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { fileId } = request.params;
      const file = await this.fileService.getFileById(fileId);

      if (!file) {
        reply.code(404).send({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
          },
        });
        return;
      }

      // Get file stats for Content-Length (critical per ADR-026)
      const stats = await this.fileService.getFileStats(file.storagePath);
      if (!stats.exists) {
        reply.code(404).send({
          success: false,
          error: {
            code: 'FILE_DATA_NOT_FOUND',
            message: 'File data not found on storage',
          },
        });
        return;
      }

      // Handle range requests for resumable downloads
      const rangeHeader = request.headers.range;
      let start = 0;
      let end = stats.size - 1;
      let statusCode = 200;

      if (rangeHeader) {
        const ranges = rangeHeader.replace(/bytes=/, '').split('-');
        start = parseInt(ranges[0], 10) || 0;
        end = parseInt(ranges[1], 10) || stats.size - 1;
        statusCode = 206;

        reply.header('Content-Range', `bytes ${start}-${end}/${stats.size}`);
        reply.header('Content-Length', (end - start + 1).toString());
      } else {
        // ✅ CRITICAL: Always include Content-Length for progress indication (ADR-026)
        reply.header('Content-Length', stats.size.toString());
      }

      // Set required headers per ADR-026
      reply.header('Content-Type', file.mimeType || 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${file.filename}"`);
      reply.header('Accept-Ranges', 'bytes'); // Enable resume capability
      reply.header('Cache-Control', 'private, max-age=0'); // Prevent caching large files
      
      reply.code(statusCode);

      // Create appropriate stream based on file size
      const stream = await this.fileService.createDownloadStream(fileId, { start, end });
      reply.send(stream);

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Download error:', error);
      reply.code(500).send({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to download file',
        },
      });
    }
  }

  /**
   * Delete file
   */
  async deleteFile(
    request: FastifyRequest<{ Params: { fileId: string } }>,
    _reply: FastifyReply
  ): Promise<SuccessResponse<{ deleted: boolean }> | ApiError> {
    try {
      const { fileId } = request.params;
      const deleted = await this.fileService.deleteFile(fileId);

      return {
        success: true,
        data: { deleted },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete file',
        },
      };
    }
  }

  /**
   * Create archive
   */
  async createArchive(
    request: FastifyRequest<{ Body: CreateArchiveRequest }>,
    _reply: FastifyReply
  ): Promise<SuccessResponse<ArchiveModel> | ApiError> {
    try {
      const { shootId, type, fileIds } = request.body;
      
      const archive = await this.archiveService.createArchive({
        shootId,
        type,
        fileIds,
      });

      return {
        success: true,
        data: archive,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ARCHIVE_CREATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create archive',
        },
      };
    }
  }

  /**
   * Get archive by ID
   */
  async getArchive(
    request: FastifyRequest<{ Params: { archiveId: string } }>,
    _reply: FastifyReply
  ): Promise<SuccessResponse<ArchiveModel> | ApiError> {
    try {
      const { archiveId } = request.params;
      const archive = await this.archiveService.getArchiveById(archiveId);

      if (!archive) {
        return {
          success: false,
          error: {
            code: 'ARCHIVE_NOT_FOUND',
            message: 'Archive not found',
          },
        };
      }

      return {
        success: true,
        data: archive,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_ARCHIVE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get archive',
        },
      };
    }
  }

  /**
   * Download archive with progress support (ADR-026)
   * MUST include Content-Length header for browser progress bars
   */
  async downloadArchive(
    request: FastifyRequest<{ Params: { archiveId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { archiveId } = request.params;
      const archive = await this.archiveService.getArchiveById(archiveId);

      if (!archive || archive.status !== 'completed') {
        reply.code(404).send({
          success: false,
          error: {
            code: 'ARCHIVE_NOT_READY',
            message: 'Archive not found or not ready for download',
          },
        });
        return;
      }

      // Check if archive has expired
      if (new Date() > new Date(archive.expiresAt)) {
        reply.code(410).send({
          success: false,
          error: {
            code: 'ARCHIVE_EXPIRED',
            message: 'Archive has expired',
          },
        });
        return;
      }

      // ✅ CRITICAL: Always include Content-Length for progress indication (ADR-026)
      reply.header('Content-Length', archive.size.toString());
      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', `attachment; filename="archive_${archiveId}.zip"`);
      reply.header('Accept-Ranges', 'bytes');
      reply.header('Cache-Control', 'private, max-age=0');

      // Get archive download stream
      const stream = await this.archiveService.createArchiveDownloadStream(archiveId);
      reply.send(stream);

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Archive download error:', error);
      reply.code(500).send({
        success: false,
        error: {
          code: 'ARCHIVE_DOWNLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to download archive',
        },
      });
    }
  }
}