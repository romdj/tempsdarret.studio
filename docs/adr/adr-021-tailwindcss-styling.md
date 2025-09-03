# ADR-021: TailwindCSS + DaisyUI for Styling

## Status

Accepted

## Date

2025-08-09

## Context

Our photography platform frontend requires a consistent, professional design system that can handle complex gallery layouts, responsive image displays, and accessible client interfaces. The styling solution must integrate well with SvelteKit and support the visual requirements of photography portfolios.

## Decision

We will use **TailwindCSS** as our primary CSS framework with **DaisyUI** component library for building consistent, responsive, and accessible photography platform interfaces.

## Rationale

### Photography-Optimized Styling

TailwindCSS provides excellent utilities for photography-specific layouts:

```html
<!-- Responsive gallery grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {#each photos as photo}
    <div class="aspect-square overflow-hidden rounded-lg bg-gray-100">
      <img 
        src={photo.thumbnailUrl} 
        alt={photo.alt}
        class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
      />
    </div>
  {/each}
</div>

<!-- Professional photography hero section -->
<section class="relative h-screen bg-gradient-to-b from-gray-900 to-gray-800">
  <img 
    src="/hero-image.jpg" 
    alt="Portfolio showcase"
    class="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
  />
  <div class="relative z-10 flex items-center justify-center h-full">
    <div class="text-center text-white">
      <h1 class="text-5xl font-bold mb-4 drop-shadow-lg">Temps D'arrêt Studio</h1>
      <p class="text-xl opacity-90">Capturing life's precious moments</p>
    </div>
  </div>
</section>
```

### DaisyUI Component Integration

```html
<!-- Professional client portal interface -->
<div class="drawer lg:drawer-open">
  <input id="drawer-toggle" type="checkbox" class="drawer-toggle" />
  
  <!-- Mobile menu button -->
  <div class="drawer-content flex flex-col">
    <div class="navbar bg-base-100 lg:hidden">
      <label for="drawer-toggle" class="btn btn-square btn-ghost">
        <svg class="w-6 h-6" fill="none" stroke="currentColor">
          <!-- Menu icon -->
        </svg>
      </label>
      <div class="flex-1 px-2 mx-2">Gallery</div>
    </div>
    
    <!-- Main content -->
    <main class="flex-1 p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each shoots as shoot}
          <div class="card bg-base-100 shadow-xl">
            <figure class="aspect-video">
              <img src={shoot.coverImage} alt={shoot.title} class="w-full h-full object-cover" />
            </figure>
            <div class="card-body">
              <h2 class="card-title">{shoot.title}</h2>
              <p class="text-base-content/70">{shoot.description}</p>
              <div class="card-actions justify-end">
                <button class="btn btn-primary">View Gallery</button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </main>
  </div>
  
  <!-- Sidebar -->
  <div class="drawer-side">
    <label for="drawer-toggle" class="drawer-overlay"></label>
    <aside class="w-64 min-h-full bg-base-200">
      <!-- Navigation menu -->
    </aside>
  </div>
</div>
```

## Implementation Guidelines

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      aspectRatio: {
        'photo': '4/3',
        'portrait': '3/4',
        'panorama': '21/9'
      },
      colors: {
        'photography': {
          50: '#f9fafb',
          500: '#6b7280',
          900: '#111827'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'zoom-in': 'zoomIn 0.2s ease-out'
      }
    }
  },
  plugins: [
    require('daisyui'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/forms')
  ],
  daisyui: {
    themes: [
      {
        photography: {
          'primary': '#059669',
          'secondary': '#7c3aed',
          'accent': '#f59e0b',
          'neutral': '#374151',
          'base-100': '#ffffff',
          'base-200': '#f9fafb',
          'base-300': '#f3f4f6',
          'info': '#3b82f6',
          'success': '#10b981',
          'warning': '#f59e0b',
          'error': '#ef4444'
        }
      }
    ]
  }
};
```

## Trade-offs

### Benefits Gained
- **Rapid development** with utility-first approach
- **Consistent design system** across all components
- **Professional photography layouts** with responsive grid systems
- **Accessible components** through DaisyUI integration

### Accepted Trade-offs
- **Bundle size** from comprehensive utility classes
- **Learning curve** for utility-first CSS approach
- **Design constraints** within TailwindCSS system

## Consequences

TailwindCSS with DaisyUI provides a professional, consistent, and accessible design foundation for our photography platform while enabling rapid development of complex gallery interfaces and responsive layouts.