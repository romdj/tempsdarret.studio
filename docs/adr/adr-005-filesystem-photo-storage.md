# ADR-005: File System Storage for Photography Files

## Status
Accepted

Date: 2025-01-09

## Context
The photography platform needs to store and serve high-resolution photos, thumbnails, and processed images. Files range from RAW camera files (50-100MB) to web-optimized versions (1-5MB). The business requirements include:

- Fast access for client viewing sessions
- Reliable storage for professional photography work
- Cost-effective solution for growing photo collections
- Simple backup and disaster recovery procedures
- Predictable storage costs for business planning
- No vendor lock-in for business independence

The platform serves photographers who need full control over their files and clients who expect fast photo loading.

## Decision
Implement file system storage with structured directory hierarchy:

```
/uploads/
  shoots/
    {shootId}/
      original/     # RAW/original files
      processed/    # Edited photos
      thumbnails/   # Web thumbnails
      metadata/     # EXIF and processing data
```

Key implementation details:
- Files stored on local filesystem with structured paths
- Nginx serves files directly for optimal performance
- File metadata stored in MongoDB (File Service)
- Background processing for thumbnail generation
- Rsync-based backup to external storage
- File access controlled via signed URLs with expiration

## Alternatives Considered

- **AWS S3**: Cloud object storage
  - Rejected: Ongoing costs scale with usage, network dependency, potential vendor lock-in concerns
- **CloudFlare R2**: S3-compatible object storage
  - Rejected: Similar cost and dependency concerns, less mature ecosystem
- **Google Cloud Storage**: Google's object storage
  - Rejected: Vendor lock-in, costs for photography business scale
- **CDN + Cloud Storage**: Combined approach with CDN
  - Rejected: Added complexity, ongoing CDN costs, network dependencies
- **NFS/Network Storage**: Network-attached storage
  - Rejected: Network dependency, single point of failure, complexity

## Consequences

### Positive
- Predictable storage costs (hardware investment vs ongoing cloud fees)
- No vendor lock-in - full control over photography files
- Excellent performance for file serving (local disk + nginx)
- Simple backup procedures using standard tools (rsync, tar)
- Direct file system access for debugging and maintenance
- No API rate limits or throttling from cloud providers
- Privacy control - files never leave photographer's infrastructure

### Negative
- Manual backup and disaster recovery procedures required
- No automatic scaling - need to monitor disk space
- Single server limitations (no automatic replication)
- Responsibility for hardware failure recovery
- No built-in CDN capabilities for global users
- File organization and cleanup must be handled manually

### Neutral
- Need for robust file management and monitoring procedures
- Disk space planning and capacity management
- File permission and security management at OS level

## Implementation Notes
Directory structure enforces organization and supports clean URLs:
- Original files: `/uploads/shoots/{shootId}/original/{filename}`
- Processed files: `/uploads/shoots/{shootId}/processed/{filename}` 
- Thumbnails: `/uploads/shoots/{shootId}/thumbnails/{filename}`

Security measures:
- Files served via signed URLs that expire
- Directory traversal protection in nginx configuration
- File permissions restrict access to service account only
- Regular permission audits via automated scripts

Backup strategy:
- Daily incremental backups via rsync to external storage
- Weekly full backups with long-term retention
- Database backup coordination with file backup timing
- Backup verification and restoration testing procedures

## Migration Notes
Future migration to cloud storage is possible by:
1. Implementing storage abstraction layer in File Service
2. Background sync to cloud storage while maintaining local copies
3. Gradual transition of file serving to cloud URLs
4. Metadata update to point to new storage locations

## Related Decisions
- [ADR-001: Microservices Architecture](./adr-001-microservices-architecture.md)
- [ADR-004: MongoDB Data Persistence](./adr-004-mongodb-data-persistence.md)
- [ADR-017: Progressive Deployment Strategy](./adr-017-progressive-deployment.md)

## References
- [Nginx File Serving Best Practices](https://www.nginx.com/blog/maximizing-nginx-performance-for-serving-content/)
- [File System Security Guidelines](https://wiki.archlinux.org/title/File_permissions_and_attributes)
- [Photography Backup Strategies](https://petapixel.com/2019/01/15/a-complete-guide-to-photography-backup-strategies/)