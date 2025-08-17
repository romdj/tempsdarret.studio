# Decision Log: Download Progress Indicators

**Date**: 2025-01-17  
**Status**: Decided  
**Deciders**: Development Team  

## Context

Large file downloads (25MB-50GB) in the photography platform require user-friendly progress indicators. Without proper HTTP headers, users experience painful downloads with no progress visibility, leading to poor UX and potential download abandonment.

## Decision

**Always include Content-Length header** for file downloads to enable browser progress bars.

## Problem Analysis

### When browsers show progress bars:
```http
HTTP/1.1 200 OK
Content-Length: 2684354560
Content-Type: application/zip
Content-Disposition: attachment; filename="wedding_photos.zip"

[file data...]
```
- Browser knows total size upfront
- Can calculate: `(downloaded / total) * 100`
- Shows progress bar with time remaining
- User can make informed decisions about continuing

### When browsers DON'T show progress bars:
```http
HTTP/1.1 200 OK
Transfer-Encoding: chunked
Content-Type: application/zip

[chunked data...]
```
- No `Content-Length` header
- Browser shows spinning indicator or generic "downloading..."
- No percentage, no time estimate
- Poor user experience, especially for large files

## Technical Causes of Missing Progress

1. **Streaming/Generated content**: Server doesn't know final size
2. **On-the-fly compression**: Gzip compression during transfer
3. **Chunked transfer encoding**: Server sends data in chunks
4. **Proxy interference**: Reverse proxies strip headers
5. **Server misconfiguration**: Missing Content-Length implementation

## Implementation Requirements

### File Service API Standards
```javascript
// ✅ REQUIRED: Always include Content-Length
app.get('/files/:fileId/download', async (req, res) => {
  const file = await getFileMetadata(req.params.fileId)
  const fileStats = await fs.stat(file.storagePath)
  
  // Critical headers for progress indication
  res.setHeader('Content-Length', fileStats.size)
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`)
  
  // Stream with known size
  const readStream = fs.createReadStream(file.storagePath)
  readStream.pipe(res)
})

// ❌ AVOID: Missing Content-Length
app.get('/files/:fileId/download', (req, res) => {
  // This will NOT show progress bars
  fs.createReadStream(filePath).pipe(res)
})
```

### Additional UX Enhancements
```javascript
// Optional: Add download speed headers
res.setHeader('Accept-Ranges', 'bytes') // Enable resume capability
res.setHeader('Cache-Control', 'private, max-age=0') // Prevent caching large files
```

## Exceptions

### When Content-Length is not feasible:
1. **On-demand archive generation**: Unknown final size
2. **Real-time compression**: Size varies based on content
3. **Streaming transformations**: Data modified during transfer

### Fallback strategy:
```javascript
// For generated content, estimate size if possible
if (isGeneratedContent) {
  const estimatedSize = calculateEstimatedSize(files)
  res.setHeader('X-Estimated-Size', estimatedSize) // Custom header
  // Note: Browsers won't use this, but clients can
}
```

## User Experience Impact

### With Content-Length (Good UX):
- "Downloading wedding_photos.zip... 45% (2.3GB of 5.1GB) - 3 minutes remaining"
- User can plan accordingly
- Less likely to abandon download

### Without Content-Length (Poor UX):
- "Downloading wedding_photos.zip..."
- No indication of progress or completion time
- User uncertainty leads to abandonment
- Support tickets about "stuck" downloads

## Monitoring & Validation

### Implementation checklist:
- [ ] All file download endpoints include Content-Length
- [ ] File metadata includes accurate size information
- [ ] Archive generation pre-calculates sizes when possible
- [ ] Error handling for corrupted/missing files
- [ ] Testing with various file sizes (1MB, 100MB, 1GB, 10GB+)

### Metrics to track:
- Download completion rates by file size
- User support tickets about download issues
- Browser compatibility across different clients

## Consequences

### Positive
- Improved user experience for large downloads
- Reduced support burden
- Higher download completion rates
- Professional platform behavior

### Negative
- Requires accurate file size tracking
- May need additional disk I/O to get file stats
- Cannot use for dynamically generated content without pre-calculation

## Related Decisions
- See: File storage strategy (filesystem + metadata)
- See: File service API design
- See: Archive generation workflow