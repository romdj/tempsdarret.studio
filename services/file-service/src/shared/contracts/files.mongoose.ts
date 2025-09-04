/**
 * File Service Mongoose Schemas
 * MongoDB persistence layer following ADR-027 hybrid approach
 */

import { Schema, Document, Model } from 'mongoose';
import { FileModel, ArchiveModel, FileType, ProcessingStatus, ArchiveType } from './files.api.js';

// File document interface
export interface FileDocument extends Omit<FileModel, 'id'>, Document {
  _id: string;
}

// Archive document interface
export interface ArchiveDocument extends Omit<ArchiveModel, 'id'>, Document {
  _id: string;
}

// Chunk document interface for on-demand GridFS (ADR-027)
export interface ChunkDocument extends Document {
  fileId: string;
  chunkIndex: number;
  data: Buffer;
  createdAt: Date;
  expiresAt: Date;
}

// File schema following ADR-027: Direct Filesystem + MongoDB Metadata
const fileSchema = new Schema<FileDocument>({
  filename: { type: String, required: true, index: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['jpeg', 'png', 'raw', 'video', 'sidecar', 'config'],
    index: true 
  },
  size: { type: Number, required: true, min: 0 },
  mimeType: { type: String, required: true },
  shootId: { type: String, required: true, index: true },
  storagePath: { type: String, required: true, unique: true },
  publicUrl: { type: String },
  thumbnailUrl: { type: String },
  processingStatus: { 
    type: String, 
    required: true, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true 
  },
  metadata: { type: Schema.Types.Mixed },
  tags: [{ type: String, index: true }],
  // Sidecar/config file specific fields
  photographerOnly: { type: Boolean, default: false, index: true },
  parentFileId: { type: String, index: true }, // Link to main RAW file
  sidecarType: { 
    type: String, 
    enum: ['xmp', 'psd', 'psb', 'cos', 'col', 'afphoto', 'xcf'],
    sparse: true // Allow null values
  },
}, {
  timestamps: true,
  collection: 'files'
});

// Archive schema
const archiveSchema = new Schema<ArchiveDocument>({
  shootId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['jpeg', 'raw', 'complete'] 
  },
  size: { type: Number, required: true, min: 0 },
  downloadUrl: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending' 
  },
}, {
  timestamps: true,
  collection: 'archives'
});

// Chunk schema for on-demand GridFS (ADR-027: 24-hour TTL)
const chunkSchema = new Schema<ChunkDocument>({
  fileId: { type: String, required: true, index: true },
  chunkIndex: { type: Number, required: true },
  data: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, {
  collection: 'file_chunks'
});

// Indexes for performance
fileSchema.index({ shootId: 1, type: 1 });
fileSchema.index({ processingStatus: 1, createdAt: -1 });
fileSchema.index({ 'tags': 1 });
fileSchema.index({ createdAt: -1 });

archiveSchema.index({ shootId: 1, type: 1 });
archiveSchema.index({ expiresAt: 1 }); // For cleanup
archiveSchema.index({ status: 1, createdAt: -1 });

chunkSchema.index({ fileId: 1, chunkIndex: 1 }, { unique: true });

// Pre-save middleware for storage path generation
fileSchema.pre('save', function(next) {
  if (this.isNew && !this.storagePath) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const fileExtension = this.filename.split('.').pop() || 'bin';
    this.storagePath = `/data/files/${year}/${month}/${this._id}.${fileExtension}`;
  }
  next();
});

// Pre-save middleware for archive expiration (default 7 days)
archiveSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7);
    this.expiresAt = expiration;
  }
  next();
});

// Set TTL for chunks (24 hours as per ADR-027)
chunkSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 24);
    this.expiresAt = expiration;
  }
  next();
});

// Transform function to convert document to API model
function transformFileDocument(doc: FileDocument): FileModel {
  return {
    id: doc._id,
    filename: doc.filename,
    type: doc.type,
    size: doc.size,
    mimeType: doc.mimeType,
    shootId: doc.shootId,
    storagePath: doc.storagePath,
    publicUrl: doc.publicUrl,
    thumbnailUrl: doc.thumbnailUrl,
    processingStatus: doc.processingStatus,
    metadata: doc.metadata,
    tags: doc.tags,
    photographerOnly: doc.photographerOnly,
    parentFileId: doc.parentFileId,
    sidecarType: doc.sidecarType,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function transformArchiveDocument(doc: ArchiveDocument): ArchiveModel {
  return {
    id: doc._id,
    shootId: doc.shootId,
    type: doc.type,
    size: doc.size,
    downloadUrl: doc.downloadUrl,
    expiresAt: doc.expiresAt.toISOString(),
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export {
  fileSchema,
  archiveSchema,
  chunkSchema,
  transformFileDocument,
  transformArchiveDocument,
};

// Model type exports
export type FileModelType = Model<FileDocument>;
export type ArchiveModelType = Model<ArchiveDocument>;
export type ChunkModelType = Model<ChunkDocument>;