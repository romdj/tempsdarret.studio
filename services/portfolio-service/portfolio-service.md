# Portfolio Service

## Overview
Curates and presents the photographer's best work for public marketing and business development. Maintains clear separation between complete client projects (Event Service) and polished portfolio showcase for attracting new clients.

## Core Responsibilities
- **Portfolio curation**: Select best work from client projects for public display
- **Marketing presentation**: Anonymous, polished showcase of photography skills
- **SEO optimization**: Ensure portfolio content drives business discovery
- **Story telling**: Arrange work to demonstrate range and expertise
- **Client consent management**: Ensure proper permissions for public display

## Conceptual Separation from Client Projects

### **Client Projects (Event Service) = Business Workflow**
- Complete shoots with all photos (500+ images)
- Private client delivery via `/portfolio?ref=xyz`
- Including unflattering shots, experiments, behind-the-scenes
- Full business context: pricing, client names, private details

### **Portfolio Showcase (This Service) = Marketing Tool**
- Curated selection of only the best work (~20-50 images per project)
- Public SEO-optimized display at `/portfolio/weddings`
- Anonymous presentation protecting client privacy
- Professional storytelling to attract new business

## Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with caching middleware
- **Content Source**: Event Service projects marked as portfolio-worthy
- **File Integration**: File Service for optimized image delivery
- **SEO**: Meta tag generation and sitemap creation
- **Caching**: Redis for fast public content delivery

## API Endpoints

### Public Portfolio Display
- `GET /portfolio` - Get featured portfolio overview
- `GET /portfolio/category/{category}` - Get work by category (weddings, portraits, etc.)
- `GET /portfolio/featured` - Get homepage hero content
- `GET /portfolio/project/{slug}` - Get public project showcase
- `GET /portfolio/recent` - Get recently added portfolio work

### Professional Services Integration
- `GET /services` - Get all service offerings with portfolio samples
- `GET /services/{slug}` - Get specific service with relevant work
- `GET /services/{slug}/gallery` - Get portfolio work for specific service

### SEO & Discovery
- `GET /sitemap.xml` - Generated XML sitemap for search engines
- `GET /portfolio/{slug}/meta` - Get SEO metadata for sharing
- `GET /structured-data.json` - Get JSON-LD for rich snippets

## Portfolio Curation Logic

### Selection from Client Projects
```typescript
// Query Event Service for portfolio-eligible projects
async function getPortfolioEligibleProjects(): Promise<PortfolioProject[]> {
  const projects = await eventService.getProjects({
    'portfolio.isPortfolioWorthy': true,
    'portfolio.clientConsent': true,
    'access.isPublic': true
  });
  
  return projects.map(project => ({
    id: project.id,
    slug: generatePortfolioSlug(project),
    title: anonymizeTitle(project.title),
    category: project.category,
    description: project.portfolio.portfolioDescription || generateDescription(project),
    featuredImages: project.portfolio.featuredImages, // Curated subset
    date: project.event.date,
    location: anonymizeLocation(project.event.location),
    tags: project.metadata.tags,
    featured: project.portfolio.featured || false
  }));
}
```

### Image Integration with File Service
```typescript
// Get optimized images for portfolio display
async function getPortfolioImages(projectId: string, imageIds: string[]): Promise<PortfolioImage[]> {
  const images = await Promise.all(
    imageIds.map(async (imageId) => {
      // Get image metadata from File Service
      const fileMetadata = await fileService.getImageMetadata(projectId, imageId);
      
      return {
        id: imageId,
        // Use File Service's multi-resolution system
        urls: {
          thumbnail: await fileService.getImageUrl(projectId, imageId, 'thumb'),
          medium: await fileService.getImageUrl(projectId, imageId, 'medium'), 
          high: await fileService.getImageUrl(projectId, imageId, 'high')
        },
        dimensions: fileMetadata.dimensions,
        altText: generateSEOAltText(fileMetadata),
        caption: fileMetadata.portfolioCaption
      };
    })
  );
  
  return images;
}
```

## Portfolio Project Schema

```typescript
interface PortfolioProject {
  id: string;
  slug: string;                    // SEO-friendly URL identifier
  
  // Curated content (different from client project)
  title: string;                   // Anonymized: "Elegant Garden Wedding" vs "Smith Wedding"
  description: string;             // Portfolio story, not client notes
  category: 'weddings' | 'portraits' | 'corporate' | 'landscapes';
  
  // Selected imagery
  images: {
    featured: string[];            // Hero images for this portfolio piece
    gallery: string[];             // Additional images for full view
    cover: string;                 // Primary image for category pages
  };
  
  // Anonymous event details
  event: {
    season?: string;               // "Spring 2024" instead of exact date
    setting?: string;              // "Rustic vineyard" instead of venue name
    style?: string;                // "Classic and romantic"
  };
  
  // Portfolio presentation
  presentation: {
    featured: boolean;             // Show on homepage
    categoryFeatured: boolean;     // Feature in category
    order: number;                 // Display order within category
    publishedAt: Date;             // When added to portfolio
  };
  
  // SEO optimization
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    structuredData: object;        // JSON-LD schema
  };
  
  // Source tracking
  source: {
    projectId: string;             // Link back to original client project
    curatedBy: string;             // Admin who selected for portfolio
    clientConsent: boolean;        // Permission verified
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

## Professional Services Schema

```typescript
interface ProfessionalService {
  id: string;
  slug: string;
  
  // Service details
  name: string;                    // "Wedding Photography"
  tagline: string;                 // "Capturing your most precious moments"
  description: string;
  features: string[];              // What's included
  
  // Portfolio integration
  portfolio: {
    featuredProjects: string[];    // Portfolio project IDs to showcase
    sampleImages: string[];        // Quick preview images
    testimonials?: {
      quote: string;
      client: string;              // "Sarah & Mike" (anonymized)
      project?: string;            // Link to portfolio project
    }[];
  };
  
  // Business details
  pricing: {
    type: 'starting-at' | 'packages' | 'custom';
    basePrice?: number;
    currency: string;
    note?: string;
  };
  
  process: {
    step: number;
    title: string;
    description: string;
  }[];
  
  published: boolean;
  order: number;
}
```

## Event Integration (Kafka)

### Event Consumption
```typescript
// React to changes in Event Service
'project.portfolio-status-changed' → Update portfolio curation
'project.featured-images-updated' → Refresh portfolio gallery
'project.client-consent-granted' → Enable portfolio inclusion
'project.client-consent-revoked' → Remove from portfolio immediately
'file.processed' → Update portfolio if project images were modified
```

### Event Publishing
```typescript
// Notify when portfolio changes
'portfolio.project-added' → New work added to public portfolio
'portfolio.project-updated' → Portfolio presentation updated
'portfolio.featured-changed' → Homepage featured content modified
'portfolio.seo-optimized' → SEO metadata updated for project
```

## File Service Integration

### Optimized Image Delivery
```typescript
// Leverage File Service's multi-resolution system for portfolio
class PortfolioImageService {
  async getResponsiveImages(projectId: string, imageId: string): Promise<ResponsiveImage> {
    return {
      // Gallery thumbnails (fast loading)
      thumbnail: await fileService.getImageUrl(projectId, imageId, 'thumb'), // 400px
      
      // Lightbox preview (balance of quality and speed)  
      preview: await fileService.getImageUrl(projectId, imageId, 'medium'), // 1200px
      
      // Full view (high quality for desktop)
      full: await fileService.getImageUrl(projectId, imageId, 'high'), // 2400px
      
      // Metadata for responsive loading
      metadata: await fileService.getImageMetadata(projectId, imageId)
    };
  }
}
```

### SEO Image Optimization
```typescript
// Generate SEO-optimized alt text and captions
function generateSEOContent(image: FileMetadata, project: PortfolioProject): SEOImageData {
  return {
    altText: `${project.category} photography - ${project.title} - ${image.caption || 'professional photo'}`,
    caption: image.portfolioCaption || generateAutoCaption(image, project),
    structuredData: {
      "@type": "ImageObject",
      "url": image.urls.high,
      "caption": image.portfolioCaption,
      "creator": "Temps D'arrêt Studio"
    }
  };
}
```

## Client Privacy & Anonymization

### Anonymous Presentation
```typescript
// Transform client project into anonymous portfolio piece
function anonymizeForPortfolio(clientProject: Project): PortfolioProject {
  return {
    // Transform client-specific details
    title: anonymizeTitle(clientProject.title), // "Smith Wedding" → "Elegant Garden Wedding"
    description: createPortfolioDescription(clientProject), // Professional story, not client notes
    location: anonymizeLocation(clientProject.event.location), // "Vineyard estate" not "Château XYZ"
    
    // Only include consented, curated images
    images: clientProject.portfolio.featuredImages, // Not all 500+ photos
    
    // Remove all client PII
    clientInfo: undefined, // No names, emails, or personal details
    
    // Professional presentation
    story: createVisualStory(clientProject), // Marketing narrative
  };
}
```

## Implementation Phases

### Phase 1: Basic Portfolio Curation
- [ ] Set up integration with Event Service for portfolio-eligible projects
- [ ] Create portfolio project curation and anonymization logic
- [ ] Integrate with File Service for optimized image delivery
- [ ] Build responsive portfolio display pages
- [ ] Implement category-based organization

### Phase 2: Professional Services Showcase  
- [ ] Create professional services content management
- [ ] Build service pages with integrated portfolio samples
- [ ] Add testimonials and client stories (anonymized)
- [ ] Implement service-specific portfolio filtering
- [ ] Create inquiry and contact integration

### Phase 3: SEO & Marketing Optimization
- [ ] Implement comprehensive SEO strategy with meta tags
- [ ] Add structured data (JSON-LD) for rich snippets
- [ ] Create XML sitemap generation for search engines
- [ ] Set up performance caching and CDN integration
- [ ] Add social media sharing optimization

## Business Benefits
- **Professional separation**: Clean distinction between client delivery and marketing
- **Privacy protection**: Client consent and anonymization built-in
- **SEO advantage**: Optimized for search engine discovery
- **Quality control**: Only best work represents the business
- **Performance**: Fast loading maintains visitor engagement
- **Scalability**: Easy to add new work as business grows