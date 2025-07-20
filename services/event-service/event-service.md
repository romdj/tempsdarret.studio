# Event Service

## Overview
Manages photography projects, client assignments, and gallery access. Serves as the central hub for project lifecycle management, from creation to client delivery.

## Core Responsibilities
- **Project lifecycle**: Create, update, and manage photography projects
- **Client assignment**: Link clients to their specific projects  
- **Access control**: Manage who can view which projects
- **Gallery organization**: Structure photos within projects
- **Project metadata**: Store event details, dates, and context

## Unified Project Model
All photography work (weddings, portraits, corporate, landscapes) uses the same project structure with optional company information for professional clients.

## Key Features

### Project Management
- **Universal project creation** for all photography types
- **Client information capture** with optional company details
- **Event metadata** (date, location, duration, type)
- **Access control** (public portfolio vs private client access)
- **Project status tracking** (active, completed, archived)

### Client Access Patterns
- **Simple URL access**: `/portfolio?ref={projectId}` for client galleries
- **Magic link integration**: Seamless authentication via invite tokens
- **Permission validation**: Ensure clients only access their projects
- **Download tracking**: Monitor client engagement and file access

### Gallery Organization
- **Media aggregation**: Collect images from File Service
- **Display ordering**: Sort and organize photos for presentation
- **Featured content**: Mark standout images for portfolio use
- **Client favorites**: Allow clients to mark preferred photos

## API Endpoints

### Project Management
- `POST /projects` - Create new project
- `GET /projects/{id}` - Get project details
- `PUT /projects/{id}` - Update project information
- `DELETE /projects/{id}` - Archive project
- `GET /projects` - List projects with filtering

### Client Access
- `GET /projects/by-ref/{reference}` - Get project by client reference
- `POST /projects/{id}/access` - Validate client access
- `GET /projects/{id}/gallery` - Get project gallery with images
- `POST /projects/{id}/download/{mediaId}` - Log download activity

### Portfolio Integration
- `GET /portfolio/featured` - Get featured projects for public display
- `GET /portfolio/category/{category}` - Get projects by type
- `POST /projects/{id}/publish` - Make project publicly visible

## Project Schema

```typescript
interface Project {
  id: string;
  reference: string;              // Unique client-friendly reference
  
  // Project details
  title: string;
  category: 'weddings' | 'portraits' | 'landscapes' | 'private-events' | 'professional';
  description?: string;
  
  // Event information
  event: {
    date: Date;
    location?: string;
    duration?: number;            // Hours
    attendees?: number;
    type?: string;               // "wedding ceremony", "corporate headshots", etc.
  };
  
  // Client information (unified for all project types)
  client: {
    name?: string;
    email?: string;
    phone?: string;
    
    // Company info for professional events only
    company?: {
      name: string;
      industry?: string;
      website?: string;
      contactPerson?: string;
      billingAddress?: string;
    };
  };
  
  // Access and visibility
  access: {
    isPublic: boolean;           // Show in public portfolio
    isFeatured: boolean;         // Featured on homepage
    allowClientAccess: boolean;  // Enable /portfolio?ref=xyz access
    allowDownloads: boolean;     // Client can download files
    expiresAt?: Date;           // Time-limited access
  };
  
  // Project status
  status: {
    current: 'planning' | 'shooting' | 'processing' | 'delivered' | 'archived';
    photosUploaded: number;
    photosProcessed: number;
    clientNotified: boolean;
    lastClientAccess?: Date;
  };
  
  // Media organization
  media: {
    totalImages: number;
    featuredImageIds: string[];  // Highlighted photos
    coverImageId?: string;       // Project thumbnail
    lastUpdated: Date;
  };
  
  // Business metadata
  metadata: {
    tags: string[];
    equipment?: string;
    techniques?: string;
    weather?: string;
    notes?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;             // Admin user ID
}
```

## Event Publishing (Kafka)

### Project Lifecycle Events
- `project.created` - New project initialized
- `project.updated` - Project details modified  
- `project.published` - Made visible in public portfolio
- `project.featured` - Marked as featured content
- `project.archived` - Moved to archive status

### Client Interaction Events
- `project.accessed` - Client viewed their gallery
- `project.download-requested` - Client initiated file download
- `project.favorites-updated` - Client marked favorite photos

### Integration Events  
- `project.invite-sent` - Magic link sent to client
- `project.photos-ready` - All photos processed and available
- `project.expiring-soon` - Access expires within 7 days

## Event Consumption

### From File Service
- `file.uploaded` → Update project photo count
- `file.processed` → Mark photos as ready for client
- `file.deleted` → Update project media statistics

### From Invite Service
- `invite.created` → Enable client access for project
- `invite.accepted` → Log first client access
- `invite.expired` → Disable client access

### From User Service
- `auth.project-accessed` → Update last access timestamp
- `user.created` → Link existing projects to new user account

## Business Logic Patterns

### Project Reference Generation
```typescript
// Generate client-friendly project references
// wedding-2024-smith-june
// portrait-session-doe-family
// corporate-headshots-techcorp
generateProjectReference(category: string, client: string, date: Date): string
```

### Access Validation
```typescript
// Validate client can access project
async validateProjectAccess(projectRef: string, clientToken?: string): Promise<boolean> {
  // Check if project exists and is accessible
  // Validate magic link token if provided
  // Ensure access hasn't expired
  // Log access attempt for analytics
}
```

### Gallery Compilation
```typescript
// Aggregate media from File Service into organized gallery
async compileProjectGallery(projectId: string): Promise<GalleryView> {
  // Fetch all project images from File Service
  // Apply client visibility filters
  // Sort by display order and featured status
  // Include download permissions per file
}
```

## Integration Points

### With File Service
- Query project images and metadata
- Validate file access permissions
- Track download activity

### With Invite Service  
- Coordinate project access with magic links
- Sync access permissions and expiration
- Handle invite acceptance workflows

### With Portfolio Service
- Sync featured projects for public display
- Share project metadata for SEO
- Coordinate category-based browsing

## Implementation Phases

### Phase 1: Core Project Management
- [ ] Set up project CRUD operations with unified schema
- [ ] Implement client reference generation system
- [ ] Build project access validation logic
- [ ] Create basic gallery compilation from File Service
- [ ] Add project status tracking

### Phase 2: Client Access Integration
- [ ] Implement `/portfolio?ref=xyz` access pattern
- [ ] Integrate with magic link authentication
- [ ] Build client gallery view with download capabilities
- [ ] Add client interaction tracking (views, downloads)
- [ ] Create access expiration management

### Phase 3: Business Features
- [ ] Add project analytics and reporting
- [ ] Implement client favorite marking system
- [ ] Create automated project lifecycle workflows
- [ ] Build portfolio integration for public display
- [ ] Add bulk project operations for admin efficiency

## Benefits of Unified Project Model
- **Consistent workflows**: Same processes for all photography types  
- **Flexible client info**: Company details when needed, optional otherwise
- **Simplified access**: Single reference pattern for all project types
- **Business intelligence**: Unified analytics across all work
- **Scalable growth**: Easy to add new photography categories