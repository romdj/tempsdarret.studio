# File Service

## Overview
Handles file upload, processing, and serving for self-hosted photography portfolio. Manages multiple image resolutions and secure local file storage with path-based references organized by media ID.

## Self-Hosted Architecture
- **Local storage**: Files stored on server filesystem
- **Media-centric organization**: Each image and its variants grouped together
- **Path-based references**: Database stores file paths, not file content
- **Multiple resolutions**: 4 variants per image for different use cases
- **Direct serving**: Nginx/Express serves files with authentication
- **Cost-effective**: No cloud storage fees, complete control

## Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with multer for uploads
- **Image processing**: Sharp for resize/optimization
- **Storage**: Local filesystem with organized directory structure
- **Web server**: Nginx reverse proxy for static file serving
- **Security**: Path validation and access control

## File Storage Structure
```
/var/www/portfolio-files/
├── projects/
│   ├── {projectId}/
│   │   ├── {media_id_001}/
│   │   │   ├── original/     # img_001.cr3 (25MB+ original)
│   │   │   ├── high/         # img_001.jpg (2-5MB high quality)
│   │   │   ├── medium/       # img_001.jpg (500KB-1MB preview)
│   │   │   └── thumb/        # img_001.jpg (50-100KB thumbnail)
│   │   ├── {media_id_002}/
│   │   │   ├── original/
│   │   │   ├── high/
│   │   │   ├── medium/
│   │   │   └── thumb/
│   │   └── metadata.json     # Project-level metadata
│   └── temp/                 # Temporary upload processing
├── portfolio/                # Public portfolio images
└── backups/                 # Automated backups
```

## API Endpoints

### File Upload
- `POST /upload/project/{projectId}` - Upload files to project
- `POST /upload/portfolio` - Upload for public portfolio
- `GET /upload/status/{uploadId}` - Check upload progress
- `DELETE /upload/cancel/{uploadId}` - Cancel ongoing upload

### File Access
- `GET /files/project/{projectId}/{mediaId}` - Get image metadata
- `GET /files/serve/{projectId}/{mediaId}/{resolution}` - Serve image file
- `GET /files/download/{projectId}/{mediaId}` - Download original file
- `DELETE /admin/files/{projectId}/{mediaId}` - Delete entire media unit

### File Management
- `POST /files/process/{projectId}/{mediaId}` - Trigger processing for specific media
- `POST /files/process/{projectId}` - Trigger batch processing for project
- `GET /files/stats` - Storage usage statistics
- `POST /files/cleanup` - Clean up orphaned files

## Updated Project Schema with Media-Centric Paths

```typescript
interface ProjectImage {
  id: string; // Also serves as directory name (media_id)
  originalName: string;
  mimeType: string;
  
  // File paths organized by media ID
  paths: {
    original: string;   // /projects/{projectId}/{mediaId}/original/{filename}
    high: string;       // /projects/{projectId}/{mediaId}/high/{filename}
    medium: string;     // /projects/{projectId}/{mediaId}/medium/{filename}
    thumb: string;      // /projects/{projectId}/{mediaId}/thumb/{filename}
  };
  
  // File information
  sizes: {
    original: number;   // File size in bytes
    high: number;
    medium: number;
    thumb: number;
  };
  
  // Image dimensions
  dimensions: {
    width: number;      // Original width
    height: number;     // Original height
  };
  
  // Processing status
  processing: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    resolutionsReady: ('original' | 'high' | 'medium' | 'thumb')[];
    processedAt?: Date;
    error?: string;
  };
  
  // Display settings
  display: {
    featured: boolean;
    publicVisible: boolean;
    altText?: string;
    caption?: string;
    sortOrder: number;
  };
  
  // Metadata
  metadata: {
    camera?: string;
    lens?: string;
    settings?: string;
    dateTaken?: Date;
    location?: string;
  };
  
  uploadedAt: Date;
}

interface Project {
  id: string;
  title: string;
  // ... other project fields
  
  // All images stored as array in project document
  images: ProjectImage[];
  
  // Project file statistics
  fileStats: {
    totalImages: number;
    totalSize: number;
    storageUsed: {
      original: number;
      high: number;
      medium: number;
      thumb: number;
    };
  };
}
```

## Image Resolution Strategy

### 1. Thumbnail (50-100KB)
```typescript
// For gallery grids and previews
width: 400px, quality: 70%, format: JPEG
path: /projects/{projectId}/{mediaId}/thumb/{filename}.jpg
```

### 2. Medium (500KB-1MB)
```typescript
// For lightbox previews and mobile viewing
width: 1200px, quality: 80%, format: JPEG
path: /projects/{projectId}/{mediaId}/medium/{filename}.jpg
```

### 3. High (2-5MB)
```typescript
// For desktop full-screen viewing
width: 2400px, quality: 85%, format: JPEG
path: /projects/{projectId}/{mediaId}/high/{filename}.jpg
```

### 4. Original (25MB+)
```typescript
// For client downloads - unchanged
format: Original (RAW/JPEG), no processing
path: /projects/{projectId}/{mediaId}/original/{filename}.cr3
```

## File Processing Pipeline

```typescript
// Upload and processing flow
async function processUpload(projectId: string, file: UploadedFile) {
  const mediaId = generateMediaId(); // e.g., "img_001", "media_abc123"
  const baseDir = `/var/www/portfolio-files/projects/${projectId}/${mediaId}`;
  
  // 1. Create directory structure
  await createDirectories([
    `${baseDir}/original`,
    `${baseDir}/high`, 
    `${baseDir}/medium`,
    `${baseDir}/thumb`
  ]);
  
  // 2. Save original file
  const originalPath = `${baseDir}/original/${file.originalName}`;
  await saveFile(file.buffer, originalPath);
  
  // 3. Queue processing job (async)
  await queueImageProcessing(projectId, mediaId, originalPath);
  
  // 4. Return immediate response
  return {
    mediaId,
    status: 'processing',
    paths: generatePathsForMedia(projectId, mediaId, file.originalName)
  };
}
```

## Enhanced File Management Operations

### Delete Media Unit
```typescript
// Delete entire media and all its resolutions
async function deleteMedia(projectId: string, mediaId: string) {
  const mediaDir = `/var/www/portfolio-files/projects/${projectId}/${mediaId}`;
  
  // Remove entire directory tree
  await rm(mediaDir, { recursive: true, force: true });
  
  // Update database
  await removeImageFromProject(projectId, mediaId);
  
  // Publish event
  await publishEvent('file.deleted', { projectId, mediaId });
}
```

### Bulk Operations
```typescript
// Process all media in a project
async function processProject(projectId: string) {
  const projectDir = `/var/www/portfolio-files/projects/${projectId}`;
  const mediaDirs = await readdir(projectDir);
  
  for (const mediaId of mediaDirs) {
    if (mediaId !== 'metadata.json' && mediaId !== 'temp') {
      await queueImageProcessing(projectId, mediaId);
    }
  }
}
```

## API Implementation Examples

### Serve File Endpoint
```typescript
GET /files/serve/{projectId}/{mediaId}/medium
Authorization: Bearer {token}

// Implementation
async function serveFile(req: Request, res: Response) {
  const { projectId, mediaId, resolution } = req.params;
  
  // Validate access permissions
  if (!await canAccessProject(req.user, projectId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Build file path
  const mediaDir = `/var/www/portfolio-files/projects/${projectId}/${mediaId}`;
  const filePath = `${mediaDir}/${resolution}/`;
  
  // Find file in resolution directory
  const files = await readdir(filePath);
  if (files.length === 0) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Serve file with proper headers
  const fullPath = `${filePath}/${files[0]}`;
  res.sendFile(fullPath, {
    headers: {
      'Cache-Control': 'public, max-age=86400',
      'Content-Type': getMimeType(fullPath)
    }
  });
}
```

## Storage Management Benefits

### Easy Cleanup
```bash
# Remove specific image and all resolutions
rm -rf /var/www/portfolio-files/projects/wedding-2024/img_001/

# Backup specific images
cp -r /var/www/portfolio-files/projects/wedding-2024/img_001/ /backup/

# Check storage per image
du -sh /var/www/portfolio-files/projects/wedding-2024/*/
```

### Future Extensibility
```typescript
// Easy to add new resolutions
interface ResolutionConfig {
  print: { width: 4800, quality: 95 };     // For print orders
  social: { width: 1080, quality: 75 };    // For social media
  watermarked: { width: 1200, quality: 80, watermark: true }; // For previews
}

// Directory structure grows naturally
/projects/{projectId}/{mediaId}/
├── original/
├── high/
├── medium/
├── thumb/
├── print/        # New resolution
├── social/       # New resolution
└── watermarked/  # New resolution
```

## Security Considerations

### Path Validation
```typescript
function validateMediaPath(projectId: string, mediaId: string, resolution: string): boolean {
  // Ensure no directory traversal
  if (projectId.includes('..') || mediaId.includes('..') || resolution.includes('..')) {
    return false;
  }
  
  // Validate resolution is allowed
  const allowedResolutions = ['original', 'high', 'medium', 'thumb'];
  if (!allowedResolutions.includes(resolution)) {
    return false;
  }
  
  // Check if media directory exists
  const mediaDir = `/var/www/portfolio-files/projects/${projectId}/${mediaId}`;
  return existsSync(mediaDir);
}
```

## Event Publishing (Kafka)
- `file.uploaded` - New file uploaded to project
- `file.processing-started` - Processing started for media
- `file.processing-completed` - All resolutions generated
- `file.processing-failed` - Processing failed with error
- `file.deleted` - Media unit removed
- `file.accessed` - File served to client
- `storage.cleanup` - Cleanup job completed

## Implementation Phases

### Phase 1: Media-Centric Upload & Storage
- [ ] Set up multer for file uploads with media ID generation
- [ ] Implement media-centric directory structure creation
- [ ] Create Sharp-based processing for all resolutions
- [ ] Build file serving endpoints with path validation
- [ ] Add media metadata storage in project schema

### Phase 2: Processing Pipeline
- [ ] Implement async processing with job queues
- [ ] Add progress tracking for multi-resolution generation
- [ ] Create error handling and retry logic for failed processing
- [ ] Build batch processing for entire projects
- [ ] Add processing status monitoring

### Phase 3: Management & Optimization
- [ ] Set up Nginx for efficient static file serving
- [ ] Implement media cleanup and backup jobs
- [ ] Add storage usage monitoring per project/media
- [ ] Create bulk operations (move, copy, delete)
- [ ] Build admin interface for file management

## Cost Benefits of Self-Hosting with Media Organization
- **No transfer fees**: Unlimited bandwidth on your server
- **No storage fees**: Pay once for disk space
- **Organized growth**: Easy to understand storage usage per project
- **Atomic operations**: Clean media management (all resolutions together)
- **Simple backups**: Backup per project or per media unit
- **Complete control**: Custom processing and optimization pipelines