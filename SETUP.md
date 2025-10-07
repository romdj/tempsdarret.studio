# Temps D'arrêt - Setup Guide

Complete setup guide for running the Temps D'arrêt photography platform locally.

## Architecture Overview

All API traffic flows through Kong Gateway on port **8000**:

```
Frontend (5173) → Kong Gateway (8000) → Microservices (internal)
                         ↓
         ┌───────────────┴────────────────┐
         ↓                                ↓
    Infrastructure                  Microservices
    - MongoDB (27017)               - User Service (3002)
    - Kafka (9092)                  - Invite Service (3003)
    - Zookeeper (2181)              - Portfolio Service (3004)
    - Redis (6379)                  - Shoot Service (3005)
    - Kong DB (5432)                - File Service (3006)
                                    - Notification Service (3007)
```

**Key Point**: Microservices are **NOT** exposed externally. All traffic goes through Kong Gateway.

## Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose)
- **Node.js** 24+
- **npm** 10+
- **Git**

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd tempsdarret.studio

# Install all dependencies
npm install
```

### 2. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env and configure:
nano .env
```

**Required Configuration:**

```env
# Email notifications (see Email Setup section below)
RESEND_API_KEY=re_your_actual_key_here
RESEND_FROM_EMAIL=notifications@yourdomain.com

# Payload CMS secret (generate with: openssl rand -base64 32)
PAYLOAD_SECRET=your_generated_secret_here
```

### 3. Start Infrastructure and Services

```bash
# Start all services
docker-compose up -d

# Wait for services to be healthy (~30-60 seconds)
docker-compose ps
```

### 4. Configure Kong Gateway

```bash
# Navigate to Kong infrastructure
cd infrastructure/kong

# Run setup script
./setup.sh

# Configure services and routes
./configure-services.sh

# Test routes
./test-routes.sh
```

### 5. Verify Everything is Running

```bash
# Check all services are healthy
docker-compose ps

# Test Kong Gateway
curl http://localhost:8000/api/v1/users

# Check Kong Admin API
curl http://localhost:8001/services
```

## Email Notification Setup

For email notifications to work, you need to set up **Resend.dev**:

### Step 1: Create Resend Account

1. Go to https://resend.com/signup
2. Sign up for a free account
3. Free tier includes **100 emails/day** (sufficient for testing)

### Step 2: Verify Your Domain

**Option A: Use Resend Test Domain (Quick Start)**

Resend provides `onboarding@resend.dev` for testing:

```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Option B: Verify Your Own Domain (Production)**

1. Go to Resend Dashboard → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `tempsdarret.studio`)
4. Add the DNS records provided by Resend:
   - **SPF**: TXT record for sender authentication
   - **DKIM**: TXT record for email signing
   - **MX**: Optional, for receiving emails

Example DNS records:
```
Type  | Name                        | Value
------|-----------------------------|---------------------------------
TXT   | @                           | v=spf1 include:amazonses.com ~all
TXT   | resend._domainkey          | p=MIGfMA0GCSqGSIb3DQEBAQUAA4...
MX    | @                           | feedback-smtp.us-east-1.amazonses.com
```

5. Wait for DNS propagation (~5-60 minutes)
6. Verify domain in Resend dashboard

### Step 3: Get API Key

1. Go to Resend Dashboard → API Keys
2. Click "Create API Key"
3. Name it (e.g., "Temps D'arrêt Development")
4. Select permissions: **"Sending access"**
5. Copy the API key (starts with `re_`)
6. Add to `.env`:

```env
RESEND_API_KEY=re_abc123xyz_your_actual_key_here
```

### Step 4: Configure From Address

In `.env`:

```env
# Using Resend test domain
RESEND_FROM_EMAIL=onboarding@resend.dev

# OR using your verified domain
RESEND_FROM_EMAIL=notifications@tempsdarret.studio
```

### Step 5: Test Email Sending

```bash
# Restart notification service to pick up new env vars
docker-compose restart notification-service

# Send test invitation
curl -X POST http://localhost:8000/api/v1/invitations \
  -H "Content-Type: application/json" \
  -d '{
    "shootId": "shoot_test_123",
    "clientEmail": "your-email@example.com",
    "clientName": "Test Client"
  }'

# Check logs
docker-compose logs -f notification-service
```

### Email Notification Features

The notification service supports:

- **Invitation emails** with magic links
- **HTML templates** using Handlebars
- **Email tracking** via Payload CMS
- **Multiple channels**: Email, Slack (future), SMS (future)

### Troubleshooting Email Issues

**Problem: Emails not sending**

```bash
# Check notification service logs
docker-compose logs notification-service

# Common issues:
# 1. Invalid API key → Check RESEND_API_KEY in .env
# 2. Unverified domain → Use onboarding@resend.dev for testing
# 3. Rate limit → Free tier: 100/day, check Resend dashboard
# 4. Invalid from address → Must match verified domain
```

**Problem: Emails go to spam**

1. Verify SPF, DKIM, DMARC records
2. Use a verified domain (not Resend test domain)
3. Add DMARC policy: `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com`
4. Warm up your sending domain gradually

**Problem: Rate limits**

Free tier limits:
- 100 emails/day
- 3,000 emails/month

For production:
- Upgrade to paid plan: $20/month for 50,000 emails
- Use batch sending for multiple recipients
- Implement email queueing with BullMQ (already configured)

## Service Endpoints (via Kong Gateway)

All endpoints accessible through **http://localhost:8000**:

| Service | Endpoint | Description |
|---------|----------|-------------|
| User Service | `POST /api/v1/users` | Create user |
| User Service | `GET /api/v1/users/:id` | Get user |
| Invite Service | `POST /api/v1/invitations` | Create invitation |
| Invite Service | `GET /api/v1/magic-links/validate` | Validate magic link |
| Portfolio Service | `GET /api/v1/portfolios` | List portfolios |
| Shoot Service | `POST /api/v1/shoots` | Create shoot |
| File Service | `POST /api/v1/files/upload` | Upload file |
| Notification Service | `GET /api/v1/notifications` | List notifications |

**Direct service access is disabled** - all traffic must go through Kong.

## Development Workflow

### Running Services Locally (Without Docker)

If you want to run services locally for development:

```bash
# Start infrastructure only
docker-compose up -d mongodb kafka redis

# Run a service locally
cd services/user-service
npm install
npm run dev

# Configure to connect to local infrastructure
export MONGODB_URI=mongodb://admin:admin_password@localhost:27017/user-service?authSource=admin
export KAFKA_BROKERS=localhost:9092
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev

# Frontend will connect to Kong Gateway at http://localhost:8000
```

### Monitoring Services

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f user-service

# View Kong Gateway logs
docker-compose logs -f kong

# View Kafka messages
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic shoots \
  --from-beginning
```

## Production Deployment

See deployment guides:
- [K3s Deployment](./infrastructure/k3s-deployment/README.md)
- [Pulumi Infrastructure](./infrastructure/pulumi/README.md)

## Troubleshooting

### Services won't start

```bash
# Check service health
docker-compose ps

# Check logs
docker-compose logs <service-name>

# Restart all services
docker-compose restart

# Full reset
docker-compose down -v
docker-compose up -d
```

### Kong Gateway not routing

```bash
# Check Kong services
curl http://localhost:8001/services

# Check Kong routes
curl http://localhost:8001/routes

# Re-configure Kong
cd infrastructure/kong
./configure-services.sh
```

### Database connection issues

```bash
# Check MongoDB
docker-compose exec mongodb mongosh -u admin -p admin_password

# Check Kafka
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list
```

## Architecture Decisions

See [Architecture Decision Records](./docs/adr/):
- [ADR-029: Kong API Gateway](./docs/adr/029-kong-api-gateway.md)
- [ADR-026: File Download Strategy](./docs/adr/026-file-download-strategy.md)
- [ADR-027: Large File Handling](./docs/adr/027-large-file-handling.md)

## Additional Resources

- [Kong Gateway Documentation](./infrastructure/kong/README.md)
- [Working Roadmap](./working_roadmap.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
