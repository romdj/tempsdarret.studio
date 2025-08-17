# Decision Log: File Storage Strategy

**Date**: 2025-01-17  
**Status**: Decided  
**Deciders**: Development Team  

## Context

Self-hosted photography platform handling up to 40TB of photo data with the following requirements:
- Files ranging from small images to 50GB archives
- Kubernetes deployment with separate file service pod
- Performance critical for large file transfers (25MB-50GB)
- Self-hosted only (no cloud storage solutions)

## Decision

**Primary Strategy**: Direct Filesystem + MongoDB Metadata  
**Secondary Strategy**: On-Demand GridFS chunks for large files with 24-hour TTL

## Options Considered

### 1. Pure GridFS
- **Pros**: Built-in chunking, automatic sharding
- **Cons**: 40TB = 156M+ chunk documents, significant MongoDB overhead
- **Verdict**: Rejected due to database bloat

### 2. Cloud Storage (S3/MinIO)
- **Pros**: Scalable, managed chunking
- **Cons**: Not self-hosted
- **Verdict**: Rejected due to self-hosted requirement

### 3. Direct Filesystem Only
- **Pros**: Simple, fast, minimal overhead
- **Cons**: No chunked access for large files, no resume capability
- **Verdict**: Good foundation but insufficient for large files

### 4. Hybrid Approach (Selected)
- **Pros**: Simple storage + chunked access when needed, self-cleaning
- **Cons**: Slight complexity for on-demand chunk creation
- **Verdict**: Best of both worlds

## Implementation Details

### Primary Storage Structure
```javascript
// MongoDB Metadata Only
{
  fileId: "file_abc123",
  originalName: "wedding_shoot.zip", 
  size: 25368709120,
  storagePath: "/data/files/2024/12/file_abc123.bin",
  mimeType: "application/zip",
  shootId: "shoot_xyz",
  uploadedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Filesystem: Raw files
/data/files/2024/12/file_abc123.bin
```

### On-Demand Chunk Strategy
```javascript
// Temporary chunk collection (created on-demand for large files)
{
  _id: ObjectId,
  fileId: "file_abc123",
  chunkIndex: 245,
  data: BinData,
  createdAt: Date,
  expiresAt: Date // TTL: 24 hours
}
```

### Configuration
- **Chunk size**: 255KB (GridFS default)
- **Large file threshold**: 25MB
- **Chunk TTL**: 24 hours
- **Storage path**: `/data/files/{year}/{month}/`

## Performance Analysis

### 10GB File Chunking (On-Demand)
- Total chunks: ~41,100 documents
- Creation time: ~6-12 seconds
- Storage overhead: Temporary only
- Auto-cleanup: 24 hours

### Benefits
1. **No permanent database bloat**: Chunks are temporary
2. **Simple default behavior**: Direct filesystem streaming
3. **Optimized large file handling**: Chunked access when needed
4. **Resume capability**: For large file downloads
5. **Self-cleaning**: TTL automatically removes expired chunks

### Trade-offs
- Slight complexity for chunk creation logic
- 6-12 second delay for first large file access
- Temporary MongoDB storage increase during large file operations

## Kubernetes Considerations

```yaml
# Persistent volume for file storage
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

## Monitoring & Maintenance

- Monitor chunk collection size and cleanup
- Track large file access patterns
- Set up alerts for storage capacity
- Regular filesystem backup strategy

## Consequences

### Positive
- Efficient storage for 40TB+ of data
- No permanent MongoDB overhead
- Fast access for small/medium files
- Optimized large file handling when needed
- Self-hosted with full control

### Negative
- Additional complexity for chunk management
- Temporary storage spikes during large file operations
- Need to implement chunk creation logic

## Related Decisions
- See: Kubernetes storage configuration
- See: MongoDB TTL index implementation
- See: File service API design