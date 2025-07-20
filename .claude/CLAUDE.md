# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a photographer portfolio website project for "Temps D'arrêt" featuring:
- Public portfolio showcase (weddings, portraits, landscapes, private events)
- Professional services pages
- Client portal with passwordless authentication and invite flow
- Secure photo gallery access and downloads

## Architecture

The project is planned as a photographer portfolio with both public and private areas:

### Frontend (Planned: SvelteKit + TypeScript)
- Public pages: Home, Portfolio categories, About, Professional Services, Contact
- Client portal with passwordless login using magic links
- Secure gallery access for client-specific events

### Backend (Planned: Event-driven microservices)
- User Service: user profiles, roles, authentication
- Invite Service: magic link generation and invite flows  
- Auth Service: authentication flows and token management
- Portfolio Service: public portfolio content management
- Event & Gallery Service: client-specific galleries and events
- File Service: secure file uploads and downloads
- Notification Service: email notifications for invites
- API Gateway/BFF: unified frontend API

### Infrastructure
- Event-driven architecture using Kafka for service communication
- Planned deployment to home server with automated CI/CD
- Infrastructure as Code for server provisioning and deployment

## Development Status

This is currently in the planning phase with roadmaps defined but no implementation yet. The codebase contains:
- Development roadmaps for frontend, backend, and infrastructure
- Sitemap defining the website structure
- Architecture documentation for microservices approach

## Key Features

### Authentication Flow
- Passwordless authentication using magic links
- Invite-based user onboarding for client portal access
- Role-based access control (clients vs admin)

### Client Portal
- Secure access to client-specific photo galleries
- Download functionality for photos including raw files
- Event-based organization of photo collections

### Professional Services
- Portrait sessions, commercial photography, photo editing
- Video services including aftermovie production
- Workshop and team building photography services

## File Structure

- `roadmap.md`: Main development roadmap with frontend and infrastructure tasks
- `backend_roadmap.md`: Detailed microservices architecture with Kafka event flows
- `sitemap.md`: Website structure and navigation
- `mongodb_roadmap.md`: Database planning (if needed)
- `Visual Identity/`: Brand assets and portfolio samples