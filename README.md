[![Build Temps d'Arrêt Project](https://github.com/romdj/tempsdarret.studio/actions/workflows/build.yaml/badge.svg?branch=main)](https://github.com/romdj/tempsdarret.studio/actions/workflows/build.yaml)


# Temps D'arrêt Studio – Photographer Portfolio & Client Portal

## Overview

A modern portfolio and client portal for photographers, built with SvelteKit, Node.js, and MongoDB. Features public galleries, professional services, secure client access, and admin management.

## Monorepo Structure

- `frontend/` – SvelteKit app (public site, client portal)
- `services/` – Node.js microservices (user, invite, portfolio, event, file, notification)
- `shared/` – Shared TypeScript utilities and configs
- `infrastructure/` – IaC scripts (Docker, k8s, etc.)
- `.github/workflows/` – CI/CD pipelines

## Tech Stack

- **Frontend:** SvelteKit + TypeScript + TailwindCSS
- **Backend:** Node.js + Express + TypeScript (microservices)
- **Database:** MongoDB + Mongoose
- **Auth:** Magic.link or custom magic links
- **Storage:** Local or cloud (S3/CloudFlare)
- **Deployment:** Docker, GitHub Actions, VPS/cloud

## Key Features

- Public portfolio showcase (weddings, portraits, landscapes, private events)
- Professional services pages
- Responsive, modern UI
- Passwordless client authentication
- Secure event galleries and photo downloads
- Admin content and client management
- Invite flow for onboarding new clients

## Getting Started

1. **Clone the repo:**  
   `git clone https://github.com/romdj/tempsdarret.studio.git`
2. **Install dependencies:**  
   `npm install`
3. **Build all workspaces:**  
   `npm run build`
4. **Run locally:**  
   See each workspace’s README for details.

## Roadmaps & Documentation

- [High-Level Roadmap](./high_level_roadmap.md)
- [Implementation Roadmap](./implementation_roadmap.md)
- [Backend Microservices](./backend_roadmap.md)
- [MongoDB Data Model](./mongodb_roadmap.md)
- [Best Practices](./BEST_PRACTICES.md)

## Contributing

- Follow monorepo and workspace conventions
- See [Best Practices](./BEST_PRACTICES.md) for code style and workflow
- Use pre-commit hooks for linting and type checks

## Maintenance

- Regular backups and dependency updates
- Monitor performance and security
- See [Maintenance & Improvements](./high_level_roadmap.md)