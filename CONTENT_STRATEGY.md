# Content Management Strategy

## Current Approach: File-Based Content

The site currently uses a **file-based approach** where:
- Images are stored in `/frontend/static/images/`
- Structured data is in `/frontend/src/content/` (JSON or Markdown)
- Content is committed to git
- Changes require deployment

### Pros
- ✅ Simple, no additional services
- ✅ Version controlled (full history)
- ✅ Fast (served statically)
- ✅ Free (no CMS hosting costs)
- ✅ Full control over content structure

### Cons
- ❌ Requires code deployment for updates
- ❌ No visual editor
- ❌ Image optimization manual
- ❌ Not friendly for non-technical users

## CMS Options for Photography Portfolio

### Option 1: File-Based (Current) ⭐ Recommended for Solo
**Best for**: Solo photographer comfortable with git/markdown

**Setup**: Already done! Just add content to folders
- Store images in `static/images/`
- Store portfolio data in `src/content/` as JSON/Markdown
- Import and use in Svelte components

**Example**:
\`\`\`typescript
import portfolioData from '$content/portfolio/weddings/project-001.json';
\`\`\`

### Option 2: Payload CMS ⭐ Recommended for Growth
**Best for**: Planning to hire assistants or want easy updates

**Pros**:
- Already in your stack (notification service uses it)
- Self-hosted (MongoDB + Node)
- Great for managing media + structured content
- Can reuse existing infrastructure

**Setup** (extend existing Payload):
\`\`\`typescript
// Add collections to notification service or new content service
{
  slug: 'portfolio',
  fields: [
    { name: 'title', type: 'text' },
    { name: 'category', type: 'select', options: ['weddings', 'portraits'] },
    { name: 'coverImage', type: 'upload' },
    { name: 'gallery', type: 'array', fields: [
      { name: 'image', type: 'upload' },
      { name: 'caption', type: 'text' }
    ]},
    { name: 'featured', type: 'checkbox' }
  ]
}
\`\`\`

**API**: Fetch from frontend
\`\`\`typescript
const response = await fetch('http://localhost:8000/api/portfolio?category=weddings');
\`\`\`

### Option 3: Sanity.io (Headless CMS)
**Best for**: Want best-in-class image management + real-time previews

**Pros**:
- Excellent image handling (auto-optimization, CDN)
- Real-time content preview
- Generous free tier
- Great TypeScript support

**Cons**:
- External service dependency
- Vendor lock-in
- Monthly costs at scale

### Option 4: Strapi (Self-Hosted)
**Best for**: Want full control + visual CMS

**Pros**:
- Self-hosted
- Rich admin UI
- Media library
- REST + GraphQL APIs

**Cons**:
- Another service to run
- Resource overhead
- More complex than Payload

### Option 5: Directus
**Best for**: Want spreadsheet-like CMS

**Pros**:
- Works directly on your database
- Great for teams
- Powerful permissions

**Cons**:
- Overkill for solo use
- Learning curve

## Recommendation

### For Now (MVP/Solo): **File-Based ✅**
1. Store images in `static/images/`
2. Create JSON files in `src/content/portfolio/`
3. Load and render in Svelte components
4. Deploy when you add new work

**Workflow**:
1. Edit photo shoot
2. Export portfolio images
3. Add to `static/images/portfolio/weddings/`
4. Create `project-wedding-smith.json` with metadata
5. Git commit + deploy

### For Future (If Scaling): **Payload CMS**
When you want non-technical users to update content or hire help:
1. Add portfolio/services collections to Payload
2. Create admin UI for managing projects
3. Frontend fetches from API at build time or runtime
4. Separate content updates from code deployments

## Migration Path

1. **Phase 1** (Now): File-based, manual updates
2. **Phase 2** (Growth): Add Payload CMS for portfolio management
3. **Phase 3** (Scale): Consider CDN + image optimization service

## Quick Start: File-Based

See `/frontend/static/images/README.md` and `/frontend/src/content/README.md` for structure.

Example Svelte component:
\`\`\`svelte
<script lang="ts">
  import projects from '$content/portfolio/weddings/*.json';

  const featured = projects.filter(p => p.featured);
</script>

{#each featured as project}
  <div class="photo-card">
    <img src={project.coverImage} alt={project.title} />
    <h3>{project.title}</h3>
  </div>
{/each}
\`\`\`
