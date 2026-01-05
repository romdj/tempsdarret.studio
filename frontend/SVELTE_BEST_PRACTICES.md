# SvelteKit Best Practices

This document outlines best practices for developing the Temps D'arrêt Studio frontend using SvelteKit.

## Project Structure

### Route Organization
```
src/routes/
├── (public)/              # Public pages (no auth required)
│   ├── +page.svelte      # Home page
│   ├── about/            # About page
│   ├── portfolio/        # Portfolio showcase
│   └── contact/          # Contact page
├── (client)/             # Client portal (auth required)
│   ├── +layout.svelte    # Client layout with auth guard
│   ├── galleries/        # Gallery access
│   └── downloads/        # Download management
└── (admin)/              # Admin area (photographer only)
    └── +layout.svelte    # Admin layout with role guard
```

**Why route groups**: Parentheses `(group)` allow shared layouts without affecting URL structure.

### Component Organization
```
src/lib/
├── components/           # Reusable UI components
│   ├── ui/              # Generic UI elements (Button, Input, Card)
│   ├── gallery/         # Gallery-specific components
│   └── portfolio/       # Portfolio-specific components
├── stores/              # Svelte stores for state management
├── utils/               # Utility functions
├── services/            # API service layer
└── types/               # TypeScript types
```

## Component Best Practices

### 1. Component Composition Over Props Drilling

**❌ Avoid deep prop drilling:**
```svelte
<!-- Parent.svelte -->
<Child userData={userData} />

<!-- Child.svelte -->
<GrandChild userData={userData} />

<!-- GrandChild.svelte -->
<GreatGrandChild userData={userData} />
```

**✅ Use context API or stores:**
```svelte
<!-- Parent.svelte -->
<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';

  const user = writable(userData);
  setContext('user', user);
</script>

<!-- GreatGrandChild.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';

  const user = getContext<Writable<User>>('user');
</script>

<p>Welcome {$user.name}</p>
```

### 2. Reactive Declarations

**Use `$:` for derived state:**
```svelte
<script lang="ts">
  let photos: Photo[] = [];
  let selectedCategory = 'all';

  // ✅ Reactive filtered photos
  $: filteredPhotos = selectedCategory === 'all'
    ? photos
    : photos.filter(p => p.category === selectedCategory);

  // ✅ Reactive computed values
  $: photoCount = filteredPhotos.length;
  $: hasPhotos = photoCount > 0;
</script>

{#if hasPhotos}
  <p>Showing {photoCount} photos</p>
{/if}
```

### 3. Component Script Organization

**Consistent ordering improves readability:**
```svelte
<script lang="ts">
  // 1. Imports
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import Button from '$lib/components/ui/Button.svelte';

  // 2. Component props
  export let galleryId: string;
  export let isPublic = false;

  // 3. Component state
  let photos: Photo[] = [];
  let loading = true;
  let error: string | null = null;

  // 4. Reactive declarations
  $: hasPhotos = photos.length > 0;

  // 5. Functions
  async function loadPhotos() {
    loading = true;
    try {
      const response = await fetch(`/api/galleries/${galleryId}/photos`);
      photos = await response.json();
    } catch (e) {
      error = 'Failed to load photos';
    } finally {
      loading = false;
    }
  }

  // 6. Lifecycle hooks
  onMount(() => {
    loadPhotos();
  });
</script>
```

### 4. Type Safety

**Always use TypeScript for props and state:**
```svelte
<script lang="ts">
  import type { Photo, Gallery } from '$lib/types';

  // ✅ Typed props
  export let gallery: Gallery;
  export let onPhotoSelect: (photo: Photo) => void;

  // ✅ Typed state
  let selectedPhotos: Photo[] = [];
  let currentIndex: number = 0;

  // ✅ Typed functions
  function selectPhoto(photo: Photo): void {
    selectedPhotos = [...selectedPhotos, photo];
    onPhotoSelect(photo);
  }
</script>
```

## State Management

### 1. Stores for Global State

**Create typed stores in `src/lib/stores/`:**
```typescript
// src/lib/stores/auth.ts
import { writable } from 'svelte/store';
import type { User } from '$lib/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  return {
    subscribe,
    login: (user: User) => update(state => ({
      ...state,
      user,
      isAuthenticated: true,
      isLoading: false
    })),
    logout: () => set({
      user: null,
      isAuthenticated: false,
      isLoading: false
    }),
    setLoading: (isLoading: boolean) => update(state => ({
      ...state,
      isLoading
    }))
  };
}

export const auth = createAuthStore();
```

**Use in components:**
```svelte
<script lang="ts">
  import { auth } from '$lib/stores/auth';
</script>

{#if $auth.isAuthenticated}
  <p>Welcome, {$auth.user?.name}</p>
{/if}
```

### 2. Page Data Loading

**Use `+page.ts` or `+page.server.ts` for data fetching:**
```typescript
// src/routes/galleries/[id]/+page.ts
import type { PageLoad } from './$types';
import type { Gallery } from '$lib/types';

export const load: PageLoad = async ({ params, fetch }) => {
  const response = await fetch(`/api/galleries/${params.id}`);

  if (!response.ok) {
    throw new Error('Gallery not found');
  }

  const gallery: Gallery = await response.json();

  return {
    gallery
  };
};
```

```svelte
<!-- src/routes/galleries/[id]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;

  $: ({ gallery } = data);
</script>

<h1>{gallery.title}</h1>
```

## Performance Optimization

### 1. Lazy Loading Components

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let GalleryViewer: any;

  onMount(async () => {
    // Load heavy component only when needed
    const module = await import('$lib/components/gallery/GalleryViewer.svelte');
    GalleryViewer = module.default;
  });
</script>

{#if GalleryViewer}
  <svelte:component this={GalleryViewer} {...props} />
{/if}
```

### 2. Image Optimization

**Use responsive images with `srcset`:**
```svelte
<script lang="ts">
  export let photo: Photo;

  // Assume API provides multiple resolutions
  const srcset = `
    ${photo.thumbnailUrl} 400w,
    ${photo.mediumUrl} 800w,
    ${photo.highUrl} 1200w
  `;
</script>

<img
  src={photo.mediumUrl}
  srcset={srcset}
  sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
  alt={photo.title}
  loading="lazy"
/>
```

### 3. Debouncing User Input

```svelte
<script lang="ts">
  import { debounce } from '$lib/utils/debounce';

  let searchTerm = '';
  let searchResults = [];

  const performSearch = debounce(async (term: string) => {
    const response = await fetch(`/api/search?q=${term}`);
    searchResults = await response.json();
  }, 300);

  $: performSearch(searchTerm);
</script>

<input
  type="text"
  bind:value={searchTerm}
  placeholder="Search photos..."
/>
```

## Accessibility

### 1. Semantic HTML

```svelte
<!-- ✅ Good: Semantic structure -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/portfolio">Portfolio</a></li>
  </ul>
</nav>

<main>
  <article>
    <h1>Gallery Title</h1>
    <section aria-label="Photo grid">
      <!-- Photos -->
    </section>
  </article>
</main>

<!-- ❌ Avoid: Div soup -->
<div class="nav">
  <div class="nav-item">Home</div>
</div>
```

### 2. Keyboard Navigation

```svelte
<script lang="ts">
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectPhoto();
    }
  }
</script>

<div
  role="button"
  tabindex="0"
  on:click={selectPhoto}
  on:keydown={handleKeydown}
  aria-label="Select photo"
>
  <img src={photo.thumbnailUrl} alt={photo.title} />
</div>
```

### 3. ARIA Labels

```svelte
<button
  aria-label="Download {photo.title}"
  aria-busy={isDownloading}
  disabled={isDownloading}
>
  {#if isDownloading}
    <span aria-hidden="true">⏳</span>
    Downloading...
  {:else}
    <span aria-hidden="true">⬇️</span>
    Download
  {/if}
</button>
```

## Error Handling

### 1. Error Boundaries

```svelte
<!-- src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';

  $: error = $page.error;
  $: status = $page.status;
</script>

<div class="error-container">
  <h1>{status}</h1>
  <p>{error?.message ?? 'An unexpected error occurred'}</p>
  <a href="/">Return home</a>
</div>
```

### 2. Form Validation

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  export let form: ActionData;

  let email = '';
  let emailError = '';

  function validateEmail(value: string): boolean {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    emailError = isValid ? '' : 'Invalid email address';
    return isValid;
  }

  $: validateEmail(email);
</script>

<form method="POST" use:enhance>
  <label for="email">Email</label>
  <input
    id="email"
    name="email"
    type="email"
    bind:value={email}
    aria-invalid={!!emailError}
    aria-describedby={emailError ? 'email-error' : undefined}
    required
  />

  {#if emailError}
    <span id="email-error" class="error">{emailError}</span>
  {/if}

  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <button type="submit" disabled={!!emailError}>Submit</button>
</form>
```

## API Integration

### 1. Service Layer

**Create API services in `src/lib/services/`:**
```typescript
// src/lib/services/gallery.service.ts
import type { Gallery, Photo } from '$lib/types';

const API_BASE = '/api/v1';

export class GalleryService {
  static async getGalleries(): Promise<Gallery[]> {
    const response = await fetch(`${API_BASE}/galleries`);
    if (!response.ok) throw new Error('Failed to fetch galleries');
    return response.json();
  }

  static async getGallery(id: string): Promise<Gallery> {
    const response = await fetch(`${API_BASE}/galleries/${id}`);
    if (!response.ok) throw new Error('Gallery not found');
    return response.json();
  }

  static async getPhotos(galleryId: string): Promise<Photo[]> {
    const response = await fetch(`${API_BASE}/galleries/${galleryId}/photos`);
    if (!response.ok) throw new Error('Failed to fetch photos');
    return response.json();
  }
}
```

**Use in components:**
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { GalleryService } from '$lib/services/gallery.service';
  import type { Gallery } from '$lib/types';

  let galleries: Gallery[] = [];
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      galleries = await GalleryService.getGalleries();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });
</script>
```

### 2. Environment Variables

**Use `$env` module for environment variables:**
```svelte
<script lang="ts">
  import { PUBLIC_API_URL } from '$env/static/public';
  import { PRIVATE_API_KEY } from '$env/static/private'; // Server-side only

  // API calls use PUBLIC_API_URL
  const apiUrl = PUBLIC_API_URL;
</script>
```

## Testing

### 1. Component Tests

```typescript
// src/lib/components/gallery/PhotoCard.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import PhotoCard from './PhotoCard.svelte';

describe('PhotoCard', () => {
  const mockPhoto = {
    id: '1',
    title: 'Test Photo',
    thumbnailUrl: '/test.jpg',
    mediumUrl: '/test-medium.jpg'
  };

  it('renders photo with correct title', () => {
    render(PhotoCard, { props: { photo: mockPhoto } });
    expect(screen.getByAltText('Test Photo')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    let selected = false;
    const { component } = render(PhotoCard, {
      props: {
        photo: mockPhoto,
        onSelect: () => { selected = true; }
      }
    });

    await screen.getByRole('button').click();
    expect(selected).toBe(true);
  });
});
```

### 2. Integration Tests

```typescript
// src/routes/galleries/+page.test.ts
import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import GalleriesPage from './+page.svelte';

describe('Galleries Page', () => {
  it('loads and displays galleries', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { id: '1', title: 'Wedding Gallery' },
          { id: '2', title: 'Portrait Gallery' }
        ])
      } as Response)
    );

    render(GalleriesPage);

    await waitFor(() => {
      expect(screen.getByText('Wedding Gallery')).toBeInTheDocument();
      expect(screen.getByText('Portrait Gallery')).toBeInTheDocument();
    });
  });
});
```

## Security

### 1. Input Sanitization

```svelte
<script lang="ts">
  import { sanitizeHtml } from '$lib/utils/sanitize';

  export let userComment: string;

  // ✅ Sanitize user-generated content
  $: safeComment = sanitizeHtml(userComment);
</script>

<!-- Safe HTML rendering -->
{@html safeComment}
```

### 2. CSRF Protection

**SvelteKit automatically provides CSRF protection for form actions.**

```svelte
<!-- Forms automatically include CSRF token -->
<form method="POST" action="/api/invite">
  <input name="email" type="email" required />
  <button type="submit">Send Invite</button>
</form>
```

### 3. Authentication Guards

```typescript
// src/routes/(client)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  return {
    user: locals.user
  };
};
```

## Styling Best Practices

### 1. Component-Scoped Styles

```svelte
<script lang="ts">
  export let variant: 'primary' | 'secondary' = 'primary';
</script>

<button class="btn {variant}">
  <slot />
</button>

<style>
  /* Scoped to this component only */
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-weight: 600;
    transition: background-color 0.2s;
  }

  .btn.primary {
    background-color: #3b82f6;
    color: white;
  }

  .btn.secondary {
    background-color: #6b7280;
    color: white;
  }

  .btn:hover {
    opacity: 0.9;
  }
</style>
```

### 2. Tailwind CSS with DaisyUI

```svelte
<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';

  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };
</script>

<!-- Combine Tailwind + DaisyUI classes -->
<button class="btn btn-primary {sizeClasses[size]}">
  <slot />
</button>
```

### 3. CSS Variables for Theming

```svelte
<style>
  :root {
    --color-primary: #3b82f6;
    --color-secondary: #6b7280;
    --spacing-unit: 0.25rem;
  }

  .card {
    background-color: var(--color-primary);
    padding: calc(var(--spacing-unit) * 4);
  }
</style>
```

## Code Organization Patterns

### 1. Feature-Based Structure

```
src/lib/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── services/
│   │   └── types/
│   ├── gallery/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── services/
│   │   └── types/
│   └── portfolio/
│       ├── components/
│       ├── stores/
│       ├── services/
│       └── types/
```

### 2. Shared UI Components

```
src/lib/components/ui/
├── Button.svelte
├── Input.svelte
├── Card.svelte
├── Modal.svelte
└── index.ts  # Export all components
```

```typescript
// src/lib/components/ui/index.ts
export { default as Button } from './Button.svelte';
export { default as Input } from './Input.svelte';
export { default as Card } from './Card.svelte';
export { default as Modal } from './Modal.svelte';
```

```svelte
<!-- Usage -->
<script lang="ts">
  import { Button, Input, Card } from '$lib/components/ui';
</script>
```

## Common Pitfalls to Avoid

### ❌ 1. Mutating Props Directly

```svelte
<script lang="ts">
  export let items: string[];

  // ❌ Don't mutate props
  function addItem(item: string) {
    items.push(item); // This mutates the parent's data
  }

  // ✅ Dispatch events or use callbacks
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{ add: string }>();

  function addItem(item: string) {
    dispatch('add', item);
  }
</script>
```

### ❌ 2. Missing Reactivity

```svelte
<script lang="ts">
  let user = { name: 'John', age: 30 };

  // ❌ This won't trigger reactivity
  function incrementAge() {
    user.age += 1; // Svelte doesn't detect nested mutations
  }

  // ✅ Reassign to trigger reactivity
  function incrementAge() {
    user = { ...user, age: user.age + 1 };
  }
</script>
```

### ❌ 3. Memory Leaks with Stores

```svelte
<script lang="ts">
  import { myStore } from '$lib/stores';

  // ❌ Manual subscription without cleanup
  const unsubscribe = myStore.subscribe(value => {
    console.log(value);
  });
  // Forgot to call unsubscribe onDestroy

  // ✅ Use auto-subscription with $
  $: console.log($myStore);

  // ✅ Or cleanup manually
  import { onDestroy } from 'svelte';

  const unsubscribe = myStore.subscribe(value => {
    console.log(value);
  });

  onDestroy(unsubscribe);
</script>
```

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte Tutorial](https://svelte.dev/tutorial)
- [SvelteKit FAQ](https://kit.svelte.dev/faq)
- [Svelte Society Recipes](https://sveltesociety.dev/recipes)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [DaisyUI Components](https://daisyui.com/components/)
