import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "./common.tsp";

using TypeSpec.OpenAPI;
using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{ title: "File Service API" })
@OpenAPI.info(#{ version: "1.0.0" })
namespace FileService;

/**
Major Camera RAW File Formats
Canon: .CR2, .CR3
Nikon: .NEF, .NRW
Sony: .ARW
Olympus: .ORF
Leica: .DNG, .RWL
Hasselblad: .3FR, .FFF
Phase One: .IIQ
*/

/*
Sidecar/Config File Formats for Top Image Editors
Adobe Lightroom: .XMP (sidecar for RAW edits/metadata)
Adobe Photoshop: .PSD (internal), .XMP (for RAW), .PSB (large docs)
Capture One: .COS, .COL, .XMP (sidecar for RAW edits/metadata)
Affinity Photo: .AFPHOTO (internal project file)
GIMP: .XCF (internal project file)
*/
@doc("File type enumeration")
enum FileType {
  jpeg: "jpeg",
  png: "png",
  raw: "raw",
  video: "video",
}

@doc("File processing status")
enum ProcessingStatus {
  pending: "pending",
  processing: "processing",
  completed: "completed",
  failed: "failed",
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
  metadata?: Record<unknown>;

  @doc("File tags")
  tags?: string[];

  ...Timestamps;
}

@doc("File upload request metadata")
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

  ...PaginationQuery;
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

  ...Timestamps;
}

/** ---------- Download response shapes (headers + body) ---------- */
@doc("Binary file download response with progress-friendly headers")
model FileDownloadResponse {
  @statusCode _: 200;

  @doc("Response content type")
  @header("Content-Type")
  contentType: string;

  @doc("File size in bytes for download progress indication")
  @header("Content-Length")
  contentLength: int64;

  @doc("attachment; filename=\"...\"")
  @header("Content-Disposition")
  contentDisposition: string;

  @doc("Supports byte range requests")
  @header("Accept-Ranges")
  acceptRanges: "bytes";

  @body body: bytes;
}

@doc("Archive download response")
model ArchiveDownloadResponse {
  @statusCode _: 200;

  @header("Content-Type")
  contentType: "application/zip";

  @doc("Archive size in bytes for download progress indication")
  @header("Content-Length")
  contentLength: int64;

  @doc("attachment; filename=\"archive_{archiveId}.zip\"")
  @header("Content-Disposition")
  contentDisposition: string;

  @header("Accept-Ranges")
  acceptRanges: "bytes";

  @body body: bytes;
}

/** ---------- Multipart body shape for upload ---------- */
@doc("Multipart form-data for uploading a file with metadata")
model FileUploadMultipart {
  /** Binary file part */
  file: HttpPart<TypeSpec.Http.File>;

  /** Associated shoot ID (text field) */
  shootId: HttpPart<string>;

  /** Optional repeated tag fields: tags=foo&tags=bar */
  tags?: HttpPart<string>[];
}

@route("/files")
interface FileOperations {
  @post
  @doc("Upload a file")
  uploadFile(
    @header contentType: "multipart/form-data",
    @multipartBody body: FileUploadMultipart,
  ): SuccessResponse<File> | ApiError;

  @get
  @doc("List files with optional filtering")
  listFiles(...FileQuery): PaginatedResponse<File> | ApiError;

  @get
  @route("/{fileId}")
  @doc("Get file by ID")
  getFile(@path fileId: string): SuccessResponse<File> | ApiError;

  @get
  @route("/{fileId}/download")
  @doc("Download file with progress support. MUST include Content-Length header for browser progress bars on large files (25MB–50GB).")
  downloadFile(@path fileId: string): FileDownloadResponse | ApiError;

  @delete
  @route("/{fileId}")
  @doc("Delete file")
  deleteFile(@path fileId: string): SuccessResponse<{
    deleted: boolean;
  }> | ApiError;

  @post
  @route("/archives")
  @doc("Create archive")
  createArchive(@body request: CreateArchiveRequest): SuccessResponse<Archive> | ApiError;

  @get
  @route("/archives/{archiveId}")
  @doc("Get archive by ID")
  getArchive(@path archiveId: string): SuccessResponse<Archive> | ApiError;

  @get
  @route("/archives/{archiveId}/download")
  @doc("Download archive with progress support. MUST include Content-Length header for browser progress bars.")
  downloadArchive(@path archiveId: string): ArchiveDownloadResponse | ApiError;
}
