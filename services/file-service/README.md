# File Service

High-performance file management service implementing ADR-026 (Download Progress Indicators) and ADR-027 (File Storage Strategy) for the Temps D'arrêt Studio photography platform.

## Features

### Core Capabilities
- **Large File Support**: Handle files from small images to 50GB archives
- **Progress-Friendly Downloads**: Content-Length headers for browser progress bars (ADR-026)
- **Hybrid Storage**: Direct filesystem + on-demand chunking for optimal performance (ADR-027)
- **Multi-Format Support**: JPEG, PNG, RAW, video files with proper MIME type detection
- **Archive Generation**: On-demand ZIP archives with configurable compression
- **Background Processing**: Thumbnail generation and EXIF metadata extraction

### ADR-026 Implementation
- ✅ **Always includes Content-Length header** for file downloads
- ✅ **Supports byte range requests** for resumable downloads  
- ✅ **Progress bar compatibility** for all major browsers
- ✅ **Large file optimized** (25MB-50GB) with proper headers

### ADR-027 Implementation  
- ✅ **Direct filesystem storage** for optimal performance
- ✅ **MongoDB metadata only** (no database bloat)
- ✅ **On-demand GridFS chunks** for large files (>25MB)
- ✅ **24-hour chunk TTL** with automatic cleanup
- ✅ **Self-hosted compatible** with Kubernetes persistent volumes

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File Upload   │    │  File Download  │    │ Archive Request │
│   (Multipart)   │    │ (Progress Bar)  │    │   (Background)  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     File Handlers                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │   Upload     │ │   Download   │ │        Archive           │ │
│  │              │ │ + Range Req  │ │                          │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────┬───────────────────┬───────────────────┬───────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│   File Service  │ │ Storage Service │ │    Archive Service      │
│                 │ │                 │ │                         │
│ • Validation    │ │ • Filesystem    │ │ • ZIP Generation        │
│ • Processing    │ │ • Chunking      │ │ • Expiration            │
│ • Events        │ │ • Streaming     │ │ • Cleanup               │
└─────────┬───────┘ └─────────┬───────┘ └─────────┬───────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MongoDB + Filesystem                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │   Metadata   │ │   Raw Files  │ │      Temp Chunks         │ │
│  │  Collection  │ │ /data/files  │ │    (24hr TTL)           │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### File Operations

#### Upload File
```http
POST /files
Content-Type: multipart/form-data

Form fields:
- file: Binary file data
- shootId: Associated shoot ID
- tags: Optional tags array
```

#### List Files  
```http
GET /files?shootId=abc123&type=jpeg&page=1&limit=20
```

#### Download File (with progress support)
```http
GET /files/{fileId}/download

Response Headers:
- Content-Length: {file_size}      # Required for progress bars
- Content-Type: {mime_type}
- Content-Disposition: attachment; filename="{filename}"  
- Accept-Ranges: bytes             # Enable resumable downloads
```

#### Delete File
```http
DELETE /files/{fileId}
```

### Archive Operations

#### Create Archive
```http
POST /files/archives
Content-Type: application/json

{
  "shootId": "abc123",
  "type": "jpeg|raw|complete",
  "fileIds": ["file1", "file2"] // optional
}
```

#### Download Archive
```http
GET /files/archives/{archiveId}/download

Response Headers:
- Content-Length: {archive_size}   # Required for progress bars
- Content-Type: application/zip
- Content-Disposition: attachment; filename="archive_{id}.zip"
```

## Storage Strategy

### File Organization (ADR-027)
```
/data/files/
├── 2024/
│   ├── 01/
│   │   ├── file_abc123.jpg
│   │   └── file_def456.cr2
│   └── 02/
└── 2025/
    └── 01/
```

### Large File Handling
- **< 25MB**: Direct filesystem streaming
- **≥ 25MB**: On-demand chunk creation with 24-hour TTL
- **Chunk size**: 255KB (GridFS compatible)
- **Auto-cleanup**: Expired chunks removed hourly

## Configuration

### Environment Variables

```bash
# Server
PORT=3003

# Database
MONGO_URL=mongodb://localhost:27017/file-service

# Storage (ADR-027)
STORAGE_BASE_PATH=/data/files
CHUNK_SIZE=261120                    # 255KB
LARGE_FILE_THRESHOLD=26214400        # 25MB  
CHUNK_TTL_HOURS=24

# Processing
THUMBNAIL_SIZE=300
THUMBNAIL_QUALITY=85
ENABLE_METADATA_EXTRACTION=true
MAX_PROCESSING_TIME_MS=30000

# Archives
ARCHIVE_BASE_PATH=/data
MAX_ARCHIVE_SIZE=53687091200         # 50GB
ARCHIVE_EXPIRATION_DAYS=7
COMPRESSION_LEVEL=6
```

## File Processing

### Supported Formats

#### Images
- **JPEG**: `.jpg`, `.jpeg` - Full processing
- **PNG**: `.png` - Full processing  
- **RAW**: Multiple formats with metadata extraction
  - Canon: `.cr2`, `.cr3`
  - Nikon: `.nef`, `.nrw`
  - Sony: `.arw`
  - Olympus: `.orf`
  - Leica: `.dng`, `.rwl`
  - Hasselblad: `.3fr`, `.fff`
  - Phase One: `.iiq`

#### Video
- Basic support for video files
- No processing, metadata only

### Processing Pipeline
1. **File Upload** → Storage + Database record
2. **Background Processing** → Thumbnails + EXIF extraction
3. **Event Emission** → Notify other services
4. **Status Updates** → Track processing progress

## Event System

### Published Events
- `file.uploaded` - New file stored
- `file.processed` - Processing completed/failed
- `file.deleted` - File removed
- `archive.created` - Archive generation started
- `archive.ready` - Archive available for download

### Integration
Uses `@tempsdarret/events` shared library for type-safe event handling.

## Performance Characteristics

### Download Performance (ADR-026)
- **Small files (< 25MB)**: Direct filesystem streaming
- **Large files (≥ 25MB)**: Chunked streaming with progress
- **Resume support**: Byte range requests
- **Browser compatibility**: All major browsers show progress bars

### Upload Performance  
- **Streaming uploads**: No memory buffering for large files
- **Parallel processing**: Background thumbnail/metadata extraction
- **Validation**: MIME type detection and file validation

### Storage Efficiency (ADR-027)
- **No database bloat**: Metadata only in MongoDB
- **Temporary chunks**: Auto-expire in 24 hours
- **Optimal access**: Direct filesystem for most operations

## Deployment

### Docker
```bash
docker build -t file-service .
docker run -p 3003:3003 \
  -v /host/data:/data \
  -e MONGO_URL=mongodb://mongo:27017/file-service \
  file-service
```

### Kubernetes
Requires persistent volume for file storage:
```yaml
apiVersion: v1
kind: PersistentVolume
spec:
  capacity:
    storage: 50Ti
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /data/files
```

## Monitoring

### Health Check
```http
GET /health
```

### Metrics  
- File upload/download rates
- Storage utilization
- Processing queue status
- Chunk cleanup statistics
- Archive generation success rates

## Development

### Prerequisites
- Node.js 24+
- MongoDB 7+
- TypeScript 5+

### Setup
```bash
npm install
npm run build
npm run dev
```

### Testing
```bash
npm test                 # Run tests
npm run test:coverage    # Coverage report
npm run lint            # Code linting
```

## Technology Choices

### Core Dependencies
- **Fastify**: High-performance HTTP server
- **Mongoose**: MongoDB ODM with schema validation
- **Sharp**: Image processing and thumbnail generation
- **Archiver**: ZIP archive creation
- **ts-exif-parser**: EXIF metadata extraction

### Why These Choices?
- **Fastify over Express**: Better performance, TypeScript support
- **Sharp over ImageMagick**: Better performance, smaller footprint
- **Direct filesystem over cloud storage**: Self-hosted requirement
- **Hybrid chunking**: Balance performance vs. large file support