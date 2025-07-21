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
├── shoots/
│   ├── {shootId}/
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
│   │   ├── archives/         # Generated ZIP files (temporary)
│   │   │   ├── JPEGs.zip     # 50-100GB processed images
│   │   │   ├── RAWs.zip      # 50-100GB original files
│   │   │   ├── VIDEOS.zip    # 50-100GB video files
│   │   │   └── {shoot-name}.zip  # 200-300GB complete package
│   │   └── metadata.json     # Shoot-level metadata
│   └── temp/                 # Temporary upload processing
├── portfolio/                # Public portfolio images
└── backups/                 # Automated backups
```

## API Endpoints

### File Upload
- `POST /upload/shoot/{shootId}` - Upload files to shoot
- `POST /upload/portfolio` - Upload for public portfolio
- `GET /upload/status/{uploadId}` - Check upload progress
- `DELETE /upload/cancel/{uploadId}` - Cancel ongoing upload

### File Access
- `GET /files/shoot/{shootId}/{mediaId}` - Get image metadata
- `GET /files/serve/{shootId}/{mediaId}/{resolution}` - Serve image file
- `GET /files/download/{shootId}/{mediaId}` - Download original file
- `DELETE /admin/files/{shootId}/{mediaId}` - Delete entire media unit

### Archive Downloads (Large Files)
- `POST /archives/generate/{shootId}/jpegs` - Generate JPEGs.zip (50-100GB)
- `POST /archives/generate/{shootId}/raws` - Generate RAWs.zip (50-100GB)  
- `POST /archives/generate/{shootId}/videos` - Generate VIDEOS.zip (50-100GB)
- `POST /archives/generate/{shootId}/complete` - Generate {shoot-name}.zip (200-300GB)
- `GET /archives/status/{archiveId}` - Check archive generation progress
- `GET /archives/download/{archiveId}` - Download ready archive with resumable support
- `DELETE /archives/{archiveId}` - Clean up generated archive

### File Management
- `POST /files/process/{shootId}/{mediaId}` - Trigger processing for specific media
- `POST /files/process/{shootId}` - Trigger batch processing for shoot
- `GET /files/stats` - Storage usage statistics
- `POST /files/cleanup` - Clean up orphaned files

## Updated Shoot Schema with Media-Centric Paths

```typescript
interface ShootImage {
  id: string; // Also serves as directory name (media_id)
  originalName: string;
  mimeType: string;
  
  // File paths organized by media ID
  paths: {
    original: string;   // /shoots/{shootId}/{mediaId}/original/{filename}
    high: string;       // /shoots/{shootId}/{mediaId}/high/{filename}
    medium: string;     // /shoots/{shootId}/{mediaId}/medium/{filename}
    thumb: string;      // /shoots/{shootId}/{mediaId}/thumb/{filename}
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

interface Shoot {
  id: string;
  title: string;
  // ... other shoot fields
  
  // All images stored as array in shoot document
  images: ShootImage[];
  
  // Shoot file statistics
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
  
  // Archive management
  archives: {
    available: ('jpegs' | 'raws' | 'videos' | 'complete')[];
    lastGenerated: {
      jpegs?: Date;
      raws?: Date;
      videos?: Date;
      complete?: Date;
    };
    sizes: {
      jpegs?: number;     // Size in bytes
      raws?: number;
      videos?: number;
      complete?: number;
    };
  };
}
```

## Image Resolution Strategy

### 1. Thumbnail (50-100KB)
```typescript
// For gallery grids and previews
width: 400px, quality: 70%, format: JPEG
path: /shoots/{shootId}/{mediaId}/thumb/{filename}.jpg
```

### 2. Medium (500KB-1MB)
```typescript
// For lightbox previews and mobile viewing
width: 1200px, quality: 80%, format: JPEG
path: /shoots/{shootId}/{mediaId}/medium/{filename}.jpg
```

### 3. High (2-5MB)
```typescript
// For desktop full-screen viewing
width: 2400px, quality: 85%, format: JPEG
path: /shoots/{shootId}/{mediaId}/high/{filename}.jpg
```

### 4. Original (25MB+)
```typescript
// For client downloads - unchanged
format: Original (RAW/JPEG), no processing
path: /shoots/{shootId}/{mediaId}/original/{filename}.cr3
```

## File Processing Pipeline

```typescript
// Upload and processing flow
async function processUpload(shootId: string, file: UploadedFile) {
  const mediaId = generateMediaId(); // e.g., "img_001", "media_abc123"
  const baseDir = `/var/www/portfolio-files/shoots/${shootId}/${mediaId}`;
  
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
  await queueImageProcessing(shootId, mediaId, originalPath);
  
  // 4. Return immediate response
  return {
    mediaId,
    status: 'processing',
    paths: generatePathsForMedia(shootId, mediaId, file.originalName)
  };
}
```

## Archive Generation Pipeline (50-300GB Files)

### Archive Types and Contents
```typescript
interface ArchiveDefinition {
  jpegs: {
    name: 'JPEGs.zip';
    content: ['high', 'medium']; // Processed JPEG versions
    estimatedSize: '50-100GB';
    includes: 'All processed images in high and medium resolution';
  };
  raws: {
    name: 'RAWs.zip';
    content: ['original']; // Original RAW files
    estimatedSize: '50-100GB'; 
    includes: 'All original RAW files and unprocessed originals';
  };
  videos: {
    name: 'VIDEOS.zip';
    content: ['videos']; // Video files (separate storage)
    estimatedSize: '50-100GB';
    includes: 'All video files from the shoot';
  };
  complete: {
    name: '{project-name}.zip';
    content: ['all']; // Everything
    estimatedSize: '200-300GB';
    includes: 'Complete project: RAWs, processed images, videos, metadata';
  };
}
```

### On-Demand Archive Generation
```typescript
// Archive generation flow for large files
async function generateArchive(shootId: string, archiveType: 'jpegs' | 'raws' | 'videos' | 'complete') {
  const archiveId = generateArchiveId();
  const shoot = await getShoot(shootId);
  
  // 1. Create archive generation job
  const job = await createArchiveJob({
    archiveId,
    shootId,
    archiveType,
    status: 'queued',
    estimatedSize: calculateEstimatedSize(shoot, archiveType),
    createdAt: new Date()
  });
  
  // 2. Queue background processing (avoid blocking)
  await queueArchiveGeneration(archiveId, shootId, archiveType);
  
  // 3. Return immediate response
  return {
    archiveId,
    status: 'queued',
    estimatedSize: job.estimatedSize,
    estimatedTime: '30-120 minutes', // Based on file sizes
    downloadUrl: `/archives/download/${archiveId}` // Available when ready
  };
}

// Background archive generation worker
async function processArchiveGeneration(archiveId: string, shootId: string, archiveType: string) {
  try {
    await updateArchiveStatus(archiveId, 'generating');
    
    const outputPath = `/var/www/portfolio-files/shoots/${shootId}/archives/${getArchiveName(archiveType)}`;
    const sourcePaths = await getSourcePaths(shootId, archiveType);
    
    // Stream-based ZIP creation for large files
    await createLargeZipStream(sourcePaths, outputPath, {
      progressCallback: (progress) => updateArchiveProgress(archiveId, progress),
      compressionLevel: 1, // Minimal compression for speed
      memoryLimit: '2GB'   // Control memory usage
    });
    
    // Update completion status
    const fileSize = await getFileSize(outputPath);
    await updateArchiveStatus(archiveId, 'ready', { 
      fileSize,
      downloadUrl: `/archives/download/${archiveId}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    // Notify client (via Kafka event)
    await publishEvent('archive.ready', { shootId, archiveId, archiveType });
    
  } catch (error) {
    await updateArchiveStatus(archiveId, 'failed', { error: error.message });
    await publishEvent('archive.failed', { shootId, archiveId, error: error.message });
  }
}
```

### Archive Download with Resumable Support
```typescript
// Large file download with resume capability
async function downloadArchive(req: Request, res: Response) {
  const { archiveId } = req.params;
  const archive = await getArchive(archiveId);
  
  if (archive.status !== 'ready') {
    return res.status(404).json({ error: 'Archive not ready' });
  }
  
  // Validate access permissions
  if (!await canAccessShoot(req.user, archive.shootId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const filePath = archive.filePath;
  const stat = await fs.stat(filePath);
  const fileSize = stat.size;
  
  // Handle range requests for resumable downloads
  const range = req.headers.range;
  if (range) {
    const [start, end] = parseRange(range, fileSize);
    
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${archive.filename}"`
    });
    
    // Stream file chunk
    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    // Full file download
    res.set({
      'Content-Length': fileSize.toString(),
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${archive.filename}"`
    });
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
  
  // Log download event
  await logDownload(archiveId, req.user.id, 'archive');
}
```

### Archive Management Schema
```typescript
interface Archive {
  id: string;
  projectId: string;
  archiveType: 'jpegs' | 'raws' | 'videos' | 'complete';
  filename: string; // e.g., "JPEGs.zip", "wedding-smith-2024.zip"
  
  status: 'queued' | 'generating' | 'ready' | 'failed' | 'expired';
  progress?: number; // 0-100 for generation progress
  
  // File information
  filePath?: string;
  fileSize?: number; // In bytes
  estimatedSize?: number;
  
  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date; // Auto-cleanup after 7 days
  
  // Error handling
  error?: string;
  retryCount: number;
  
  // Download tracking
  downloadCount: number;
  lastDownloaded?: Date;
  downloadedBy: string[]; // User IDs who downloaded
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
- `file.uploaded` - New file uploaded to shoot
- `file.processing-started` - Processing started for media
- `file.processing-completed` - All resolutions generated
- `file.processing-failed` - Processing failed with error
- `file.deleted` - Media unit removed
- `file.accessed` - File served to client
- `storage.cleanup` - Cleanup job completed

### Archive Events
- `archive.requested` - Archive generation requested by client
- `archive.queued` - Archive generation added to queue
- `archive.started` - Archive generation started
- `archive.progress` - Archive generation progress update (every 10%)
- `archive.ready` - Archive ready for download
- `archive.failed` - Archive generation failed
- `archive.downloaded` - Archive downloaded by client
- `archive.expired` - Archive automatically cleaned up

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

### Phase 3: Large Archive Generation (50-300GB Files)
- [ ] Implement on-demand ZIP generation for project archives
- [ ] Create streaming ZIP creation for memory efficiency 
- [ ] Add resumable download support for large files (HTTP Range requests)
- [ ] Build archive job queue and progress tracking
- [ ] Implement automatic archive cleanup (7-day expiration)
- [ ] Add archive status monitoring and retry logic
- [ ] Create archive management in project schema

### Phase 4: Management & Optimization
- [ ] Set up Nginx for efficient static file serving and range requests
- [ ] Implement media cleanup and backup jobs
- [ ] Add storage usage monitoring per project/media
- [ ] Create bulk operations (move, copy, delete)
- [ ] Build admin interface for file and archive management
- [ ] Optimize archive generation performance for 100GB+ files

## Cost Benefits of Self-Hosting with Media Organization
- **No transfer fees**: Unlimited bandwidth on your server
- **No storage fees**: Pay once for disk space
- **Organized growth**: Easy to understand storage usage per project
- **Atomic operations**: Clean media management (all resolutions together)
- **Simple backups**: Backup per project or per media unit
- **Complete control**: Custom processing and optimization pipelines