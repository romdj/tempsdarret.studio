import "@typespec/http";
import "@typespec/rest";
import "./common.tsp";

@service({
  title: "File Service API",
  version: "1.0.0"
})
namespace FileService;

using TypeSpec.Http;
using TypeSpec.Rest;

@doc("File type enumeration")
enum FileType {
  jpeg: "jpeg",
  png: "png",
  raw: "raw",
  video: "video"
}

@doc("File processing status")
enum ProcessingStatus {
  pending: "pending",
  processing: "processing",
  completed: "completed",
  failed: "failed"
}

@doc("File model")
model File {
  @key
  @doc("Unique file identifier")
  id: string;
  
  @doc("Original filename")
  filename: string;
  
  @doc("File type")
  type: FileType;
  
  @doc("File size in bytes")
  size: int64;
  
  @doc("MIME type")
  mimeType: string;
  
  @doc("Associated shoot ID")
  shootId: string;
  
  @doc("File storage path")
  storagePath: string;
  
  @doc("Public URL (if available)")
  publicUrl?: string;
  
  @doc("Thumbnail URL (if available)")
  thumbnailUrl?: string;
  
  @doc("Processing status")
  processingStatus: ProcessingStatus;
  
  @doc("File metadata (EXIF, etc.)")
  metadata?: Record<string>;
  
  @doc("File tags")
  tags?: string[];
  
  ...Timestamps
}

@doc("File upload request")
model FileUploadRequest {
  @doc("Associated shoot ID")
  shootId: string;
  
  @doc("File tags")
  tags?: string[];
}

@doc("File query parameters")
model FileQuery {
  @doc("Filter by shoot ID")
  @query
  shootId?: string;
  
  @doc("Filter by file type")
  @query
  type?: FileType;
  
  @doc("Filter by processing status")
  @query
  processingStatus?: ProcessingStatus;
  
  @doc("Filter by tags")
  @query
  tags?: string[];
  
  ...PaginationQuery
}

@doc("Archive generation request")
model CreateArchiveRequest {
  @doc("Shoot ID")
  shootId: string;
  
  @doc("Archive type")
  type: "jpeg" | "raw" | "complete";
  
  @doc("File IDs to include (if not specified, includes all)")
  fileIds?: string[];
}

@doc("Archive model")
model Archive {
  @key
  @doc("Archive ID")
  id: string;
  
  @doc("Shoot ID")
  shootId: string;
  
  @doc("Archive type")
  type: "jpeg" | "raw" | "complete";
  
  @doc("Archive file size in bytes")
  size: int64;
  
  @doc("Download URL")
  downloadUrl: string;
  
  @doc("Archive expiration date")
  expiresAt: utcDateTime;
  
  @doc("Processing status")
  status: ProcessingStatus;
  
  ...Timestamps
}

@route("/files")
interface FileOperations {
  @post
  @doc("Upload a file")
  uploadFile(@header contentType: "multipart/form-data", @body upload: FileUploadRequest): SuccessResponse<File> | ApiError;
  
  @get
  @doc("List files with optional filtering")
  listFiles(...FileQuery): PaginatedResponse<File> | ApiError;
  
  @get
  @doc("Get file by ID")
  getFile(@path fileId: string): SuccessResponse<File> | ApiError;
  
  @delete
  @doc("Delete file")
  deleteFile(@path fileId: string): SuccessResponse<{deleted: boolean}> | ApiError;
  
  @post
  @route("/archives")
  @doc("Create archive")
  createArchive(@body request: CreateArchiveRequest): SuccessResponse<Archive> | ApiError;
  
  @get
  @route("/archives/{archiveId}")
  @doc("Get archive by ID")
  getArchive(@path archiveId: string): SuccessResponse<Archive> | ApiError;
}