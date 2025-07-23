# Documentation

This directory contains auto-generated documentation for the Temps D'arrêt Studio photography platform.

## 🚀 Quick Start

```bash
# Generate all documentation
npm run docs:generate

# Serve documentation locally
npm run docs:serve
# Then visit: http://localhost:3000
```

## 📚 Documentation Types

### API Documentation (`/api`)
- **Source**: `packages/models/main.tsp` (TypeSpec)
- **Generated**: OpenAPI 3.0 specification → Interactive HTML docs
- **Updates**: Automatically regenerated when TypeSpec models change

### Event Documentation (`/events`) 
- **Source**: `packages/events/asyncapi.yaml`
- **Generated**: AsyncAPI HTML documentation
- **Updates**: Automatically regenerated when event specs change

### Architecture Documentation (`/architecture`)
- **Source**: Manual documentation files
- **Generated**: Static documentation (coming soon)

## 🔄 Automated Workflow

1. **Developer updates TypeSpec models** → `packages/models/main.tsp`
2. **Run build** → `npm run build:models` 
3. **Generate docs** → `npm run docs:api`
4. **Result**: Fresh API documentation at `/docs/api/index.html`

Same workflow applies to AsyncAPI event documentation.

## 🛠️ Commands

```bash
# Individual documentation generation
npm run docs:api           # Generate API docs only
npm run docs:events        # Generate event docs only
npm run docs:architecture  # Generate architecture docs

# Utilities
npm run docs:clean         # Clean all generated docs
npm run docs:serve         # Serve docs on localhost:3000
```

## 🌐 GitHub Pages Integration

To enable automatic documentation deployment:

1. Enable GitHub Pages in repository settings
2. Set source to `GitHub Actions`
3. Add `.github/workflows/docs.yml` (see example below)

```yaml
name: Documentation
on:
  push:
    branches: [main]
    paths: ['packages/models/**', 'packages/events/**']
  
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run docs:generate
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

## 📝 Contributing

When adding new API endpoints or events:

1. Update TypeSpec models in `packages/models/main.tsp`
2. Update AsyncAPI specs in `packages/events/asyncapi.yaml`  
3. Run `npm run docs:generate` to update documentation
4. Commit both source changes and generated docs

Documentation will be automatically updated and deployed!