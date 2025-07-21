# MongoDB Roadmap for Photographer Portfolio Website Backend

---

## Phase 1: Schema Design & Modeling

- [ ] Define main entities and relationships  
  - User (clients, admins)  
  - Portfolio Items (photos, categories)  
  - Professional Services  
  - Events / Galleries  
  - File metadata (image/raw files info)  
- [ ] Decide on embedding vs referencing for subdocuments  
- [ ] Plan indexes for common queries (user email, event IDs, file IDs)  
- [ ] Define access control fields (roles, permissions)  
- [ ] Model audit fields (createdAt, updatedAt)

---

## Phase 2: Database Setup & Configuration

- [ ] Set up MongoDB instance (local, cloud, or self-hosted)  
- [ ] Configure connection pooling and security (auth, TLS)  
- [ ] Create initial collections based on schema  
- [ ] Implement validation rules & schema enforcement (via Mongoose or MongoDB schema validation)  
- [ ] Seed database with sample data for development

---

## Phase 3: API Design & Backend Implementation

- [ ] Choose backend framework (Node.js with Express/Koa or NestJS)  
- [ ] Set up MongoDB ODM (e.g., Mongoose) or native driver  
- [ ] Implement user authentication integration (e.g., Magic.link, JWT)  
- [ ] Build CRUD APIs for:  
  - Portfolio content  
  - Professional services  
  - Events/galleries management  
  - File metadata and upload handling  
- [ ] Implement access control middleware (role-based and resource-level)  
- [ ] Implement secure file download endpoints (signed URLs or token-based access)  
- [ ] Write unit and integration tests for APIs

---

## Phase 4: Scaling & Optimization (Future)

- [ ] Optimize queries and indexes based on usage patterns  
- [ ] Implement caching strategies if needed (Redis or in-memory)  
- [ ] Plan backups and disaster recovery  
- [ ] Monitor DB performance and scale cluster as needed

---

# V1 MongoDB Data Model (Mongoose-style Schemas)

```js
// User schema
const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: String,
  role: { type: String, enum: ['admin', 'client'], default: 'client' },
  invitedEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
  createdAt: { type: Date, default: Date.now },
});

// Portfolio Item schema
const PortfolioItemSchema = new Schema({
  title: String,
  category: { type: String, enum: ['weddings', 'portraits', 'landscapes', 'private-events'] },
  description: String,
  images: [{ url: String, altText: String }],
  createdAt: { type: Date, default: Date.now },
});

// Professional Service schema
const ProfessionalServiceSchema = new Schema({
  name: String,
  slug: { type: String, unique: true },
  description: String,
  images: [{ url: String }],
  createdAt: { type: Date, default: Date.now },
});

// Shoot schema (Updated for large file archives)
const ShootSchema = new Schema({
  title: String,
  shootDate: Date,
  category: { type: String, enum: ['weddings', 'portraits', 'corporate', 'landscapes'] },
  client: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Multi-resolution image storage
  images: [{
    id: String, // Media ID (also directory name)
    originalName: String,
    mimeType: String,
    
    // File paths organized by media ID
    paths: {
      original: String,   // /shoots/{shootId}/{mediaId}/original/{filename}
      high: String,       // /shoots/{shootId}/{mediaId}/high/{filename}
      medium: String,     // /shoots/{shootId}/{mediaId}/medium/{filename}
      thumb: String       // /shoots/{shootId}/{mediaId}/thumb/{filename}
    },
    
    // File information
    sizes: {
      original: Number,   // File size in bytes
      high: Number,
      medium: Number,
      thumb: Number
    },
    
    // Image dimensions
    dimensions: {
      width: Number,      // Original width
      height: Number      // Original height
    },
    
    // Processing status
    processing: {
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'] },
      resolutionsReady: [String], // ['original', 'high', 'medium', 'thumb']
      processedAt: Date,
      error: String
    },
    
    // Display settings
    display: {
      featured: Boolean,
      publicVisible: Boolean,
      altText: String,
      caption: String,
      sortOrder: Number
    },
    
    // Metadata
    metadata: {
      camera: String,
      lens: String,
      settings: String,
      dateTaken: Date,
      location: String
    },
    
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Project file statistics
  fileStats: {
    totalImages: Number,
    totalSize: Number,
    storageUsed: {
      original: Number,
      high: Number,
      medium: Number,
      thumb: Number
    }
  },
  
  // Archive management for large files (50-300GB)
  archives: {
    available: [{ type: String, enum: ['jpegs', 'raws', 'videos', 'complete'] }],
    lastGenerated: {
      jpegs: Date,
      raws: Date,
      videos: Date,
      complete: Date
    },
    sizes: {
      jpegs: Number,     // Size in bytes
      raws: Number,
      videos: Number,
      complete: Number
    }
  },
  
  inviteCode: String, // for client access
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Archive schema for large file downloads (50-300GB)
const ArchiveSchema = new Schema({
  shootId: { type: Schema.Types.ObjectId, ref: 'Shoot', required: true },
  archiveType: { 
    type: String, 
    enum: ['jpegs', 'raws', 'videos', 'complete'], 
    required: true 
  },
  filename: String, // e.g., "JPEGs.zip", "wedding-smith-2024.zip"
  
  status: { 
    type: String, 
    enum: ['queued', 'generating', 'ready', 'failed', 'expired'],
    default: 'queued'
  },
  progress: { type: Number, min: 0, max: 100 }, // Generation progress
  
  // File information
  filePath: String,
  fileSize: Number, // In bytes
  estimatedSize: Number,
  
  // Timing
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  completedAt: Date,
  expiresAt: Date, // Auto-cleanup after 7 days
  
  // Error handling
  error: String,
  retryCount: { type: Number, default: 0 },
  
  // Download tracking
  downloadCount: { type: Number, default: 0 },
  lastDownloaded: Date,
  downloadedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }] // User IDs who downloaded
});
