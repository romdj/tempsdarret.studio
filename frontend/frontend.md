# Frontend - SvelteKit Application

## Overview
The main user-facing application built with SvelteKit, TypeScript, and TailwindCSS. Serves both public portfolio pages and private project access via the simplified `/portfolio{projectid}` pattern.

## Technology Stack
- **Framework**: SvelteKit with TypeScript
- **Styling**: TailwindCSS + DaisyUI
- **Testing**: Vitest + Testing Library
- **Build**: Vite with optimized production builds
- **State Management**: Svelte stores

## Key Features

### Public Portfolio
- **Home page** with featured work and photographer introduction
- **Portfolio categories**: Weddings, Portraits, Landscapes, Private Events
- **Professional services** pages with detailed offerings
- **About page** with photographer story and approach
- **Contact page** with inquiry forms and business details
- **SEO optimized** for photography business discoverability

### Private Project Access
- **Simple URL pattern**: `/portfolio{projectid}` for direct client access
- **Passwordless entry** via magic links sent by email
- **Secure gallery browsing** with high-quality image viewing
- **Download capabilities** for both web-optimized and RAW files
- **Mobile-responsive** design for client convenience
- **No complex portal** - just direct project access

### Admin Interface
- **Content management** for portfolio and services
- **Project creation** and client assignment
- **File upload** with drag-and-drop interface
- **Invite system** for sending magic links to clients
- **Analytics dashboard** for business insights

## Route Structure (Based on Sitemap)
```
/                           # Home page
/portfolio                  # Portfolio overview
/portfolio/weddings         # Wedding category
/portfolio/portraits        # Portrait category
/private/events            # Private events
/professional-services/*    # Service detail pages
/about                     # About page
/contact                   # Contact page
/portfolio{projectid}      # Direct project access (private)
/admin/*                   # Admin interface (protected)
```

## Architecture

### Component Organization
```
src/
├── routes/                # SvelteKit file-based routing
│   ├── portfolio/        # Public portfolio pages
│   ├── professional-services/ # Service pages
│   └── admin/           # Admin interface
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI elements
│   ├── portfolio/       # Portfolio display components
│   ├── gallery/         # Image gallery components
│   └── admin/           # Admin interface components
├── stores/              # Svelte stores for state management
├── lib/                 # Utilities and API clients
└── styles/              # Global styles and themes
```

## Implementation Phases

### Phase 1: Foundation
- [ ] Initialize SvelteKit project with TypeScript
- [ ] Set up TailwindCSS + DaisyUI design system
- [ ] Create responsive layout and navigation
- [ ] Implement basic routing structure
- [ ] Set up shared component library

### Phase 2: Public Portfolio
- [ ] Build home page with featured work showcase
- [ ] Create portfolio category pages (weddings, portraits, etc.)
- [ ] Implement professional services pages
- [ ] Add about and contact pages with forms
- [ ] Optimize for SEO and Core Web Vitals

### Phase 3: Project Access System
- [ ] Implement `/portfolio{projectid}` routing
- [ ] Create magic link authentication flow
- [ ] Build secure gallery viewing interface
- [ ] Add download functionality for images and RAW files
- [ ] Implement session management

### Phase 4: Admin Interface
- [ ] Create admin authentication and dashboard
- [ ] Build project and content management interfaces
- [ ] Implement file upload with progress indicators
- [ ] Add client invite system with magic link generation
- [ ] Create analytics and reporting views

### Phase 5: Performance & Polish
- [ ] Optimize image loading with lazy loading and CDN
- [ ] Add progressive web app capabilities
- [ ] Implement offline support for viewed galleries
- [ ] Add accessibility improvements
- [ ] Conduct performance optimization

## API Integration
- **Single API Gateway**: Unified backend communication
- **RESTful endpoints**: Clean API consumption patterns
- **File uploads**: Multipart form handling for image uploads
- **Authentication**: JWT tokens from magic link validation
- **Real-time features**: WebSocket for upload progress

## Quality Standards
- **TypeScript strict mode** with comprehensive type safety
- **Component testing** with Vitest and Testing Library
- **E2E testing** for critical user flows
- **Accessibility compliance** (WCAG 2.1 AA)
- **Performance targets**: <3s initial load, <1s navigation
- **Mobile-first** responsive design approach

## Key Advantages of Simplified Approach
- **No complex portal** to maintain or debug
- **Easy client sharing**: Simple URL pattern
- **Reduced authentication complexity**: Magic links only
- **Better mobile experience**: Direct access to content
- **Lower maintenance**: Fewer moving parts