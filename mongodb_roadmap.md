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

// Event / Gallery schema
const EventSchema = new Schema({
  title: String,
  date: Date,
  client: { type: Schema.Types.ObjectId, ref: 'User' },
  portfolioItems: [{ type: Schema.Types.ObjectId, ref: 'PortfolioItem' }],
  files: [{ 
    filename: String, 
    url: String, 
    type: { type: String, enum: ['image', 'raw'] },
    createdAt: { type: Date, default: Date.now },
  }],
  inviteCode: String, // for invite flow if needed
  createdAt: { type: Date, default: Date.now },
});
