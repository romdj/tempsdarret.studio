# 🏠 Running Temps D'arrêt Locally

This guide will help you set up and run the complete Temps D'arrêt photography platform on your local machine for development, testing, or on-premises deployment.

## 📋 Prerequisites

### System Requirements
- **Node.js**: v20.0+ (recommended: v22.x)
- **npm**: v10.0+
- **Git**: Latest version
- **Docker**: v24.0+ (optional but recommended)
- **Docker Compose**: v2.20+

### Operating System Support
✅ **Linux** (Ubuntu 20.04+, Debian 11+, RHEL 8+)  
✅ **macOS** (Monterey 12+)  
✅ **Windows** (10/11 with WSL2 recommended)

## 🚀 Quick Start (Docker - Recommended)

The fastest way to get everything running locally:

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd tempsdarret.studio

# Copy environment files
cp .env.example .env
cp services/notification-service/.env.example services/notification-service/.env
```

### 2. Start with Docker Compose
```bash
# Start all services with dependencies
cd infrastructure/run-local
docker-compose up -d

# Check service status
docker-compose ps
```

### 3. Initialize Services
```bash
# Wait for services to be healthy
docker-compose exec notification-service npm run payload:seed

# Verify services are running
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Payload CMS Admin
```

### 4. Access the Platform
- **Frontend**: http://localhost:5173
- **Admin UI**: http://localhost:3001 (admin@tempsdarret.com / admin123!)
- **API Gateway**: http://localhost:3000
- **Notification Service**: http://localhost:3002

---

## 🛠️ Manual Setup (Development)

For development work or when you need more control:

### 1. Install Dependencies

#### Linux (Ubuntu/Debian)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
sudo apt-get install docker.io docker-compose-v2
sudo usermod -aG docker $USER
newgrp docker

# Install additional tools
sudo apt-get install -y git curl build-essential
```

#### macOS
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node@22 git docker docker-compose
brew install --cask docker

# Start Docker Desktop
open -a Docker
```

#### Windows 10/11
```powershell
# Using Chocolatey (run as Administrator)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install tools
choco install nodejs --version=22.0.0
choco install git docker-desktop
choco install make

# Alternative: Use WSL2 (recommended for development)
wsl --install Ubuntu-22.04
```

### 2. Setup External Dependencies

#### Start Infrastructure Services
```bash
# Start MongoDB, Redis, Kafka using Docker
cd infrastructure/run-local
docker-compose -f docker-compose.dev.yml up -d mongodb redis kafka zookeeper

# Wait for services to be ready (30-60 seconds)
docker-compose -f docker-compose.dev.yml ps
```

#### Verify Infrastructure
```bash
# Test MongoDB
docker exec -it tempsdarret-mongodb mongosh --eval "db.runCommand('ping')"

# Test Redis
docker exec -it tempsdarret-redis redis-cli ping

# Test Kafka
docker exec -it tempsdarret-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list
```

### 3. Install Project Dependencies
```bash
# Install root dependencies
npm install

# Install service dependencies
npm run install:all

# Build shared packages
npm run build:packages
```

### 4. Configure Environment Variables

#### Root Configuration (`.env`)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/tempsdarret
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
WEBHOOK_SECRET=your-webhook-secret

# Email (Get from Resend.dev)
RESEND_API_KEY=re_your_api_key_here

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600

# Development
NODE_ENV=development
LOG_LEVEL=info
```

#### Service-Specific Configuration
```bash
# Notification Service
cd services/notification-service
cp .env.example .env

# Edit with your specific settings
nano .env  # or code .env

# Repeat for other services
cd ../invite-service && cp .env.example .env
cd ../file-service && cp .env.example .env
```

### 5. Start Services

#### Option A: All Services at Once
```bash
# Start all services in parallel
npm run dev:all
```

#### Option B: Individual Services (for debugging)
```bash
# Terminal 1: Notification Service + Payload CMS
cd services/notification-service
npm run payload:dev    # Admin UI at :3001
npm run dev           # API at :3002

# Terminal 2: File Service
cd services/file-service
npm run dev           # API at :3003

# Terminal 3: Invite Service
cd services/invite-service
npm run dev           # API at :3004

# Terminal 4: API Gateway
cd api-gateway
npm run dev           # Gateway at :3000

# Terminal 5: Frontend
cd frontend
npm run dev           # UI at :5173
```

### 6. Initialize Data
```bash
# Create admin user and seed templates
cd services/notification-service
npm run payload:seed

# Create sample shoot data (optional)
cd ../shoot-service
npm run seed:dev
```

---

## 🐳 Docker Compose Configuration

### Docker Compose Files

All Docker Compose configurations are located in `infrastructure/run-local/`:

- **`docker-compose.dev.yml`** - Development infrastructure (MongoDB, Redis, Kafka + optional management UIs)
- **`docker-compose.yml`** - Complete production-like stack with all services
- **`.env.example`** - Environment configuration template

See [`infrastructure/run-local/README.md`](infrastructure/run-local/README.md) for detailed configuration options and management commands.

---

## 🔧 Development Tools

### Useful Scripts
```bash
# Development
npm run dev:all          # Start all services
npm run dev:frontend     # Start only frontend
npm run dev:backend      # Start only backend services

# Testing
npm run test:all         # Run all tests
npm run test:unit        # Unit tests only
npm run test:e2e         # End-to-end tests

# Building
npm run build:all        # Build all services
npm run build:frontend   # Build frontend only
npm run build:backend    # Build backend services

# Database
npm run db:reset         # Reset all databases
npm run db:seed          # Seed with sample data
npm run db:migrate       # Run migrations

# Maintenance
npm run clean            # Clean build artifacts
npm run lint:fix         # Fix linting issues
npm run type-check       # TypeScript type checking
```

### IDE Setup

#### VS Code (Recommended)
```bash
# Install recommended extensions
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
code --install-extension svelte.svelte-vscode

# Open workspace
code tempsdarret.code-workspace
```

#### IntelliJ IDEA / WebStorm
```bash
# Import project
# Enable Node.js support
# Configure TypeScript
# Install plugins: Svelte, Tailwind CSS
```

---

## 🌐 Service URLs

| Service | Development | Production | Purpose |
|---------|-------------|------------|---------|
| Frontend | http://localhost:5173 | https://tempsdarret.com | Main application |
| Admin UI | http://localhost:3001 | https://admin.tempsdarret.com | Template management |
| API Gateway | http://localhost:3000 | https://api.tempsdarret.com | Unified API |
| File Service | http://localhost:3003 | Internal | File processing |
| Invite Service | http://localhost:3004 | Internal | Magic links |
| Notification | http://localhost:3002 | Internal | Email/SMS |

---

## 🧪 Testing

### Running Tests
```bash
# Quick test
npm run test

# Comprehensive testing
npm run test:all

# Service-specific tests
cd services/notification-service && npm test
cd services/file-service && npm test

# End-to-end testing
npm run test:e2e

# Performance testing
cd services/notification-service && npm run test:performance
```

### Test Data
```bash
# Reset test database
npm run test:db:reset

# Create test shoots and users
npm run test:seed
```

---

## 🐛 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using ports
sudo netstat -tulpn | grep :3000
sudo lsof -i :3000

# Kill processes
sudo kill -9 $(lsof -t -i:3000)
```

#### Database Connection Issues
```bash
# Check MongoDB
docker exec -it tempsdarret-mongodb mongosh --eval "db.runCommand('ismaster')"

# Check Redis
docker exec -it tempsdarret-redis redis-cli ping

# Reset containers
docker-compose down && docker-compose up -d
```

#### Node.js Version Issues
```bash
# Use Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22
```

#### Permission Issues (Linux/macOS)
```bash
# Fix npm permissions
sudo chown -R $USER ~/.npm
sudo chown -R $USER /usr/local/lib/node_modules

# Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

#### Windows-Specific Issues
```powershell
# Enable WSL2 (recommended)
wsl --install
wsl --set-default-version 2

# Use Windows Terminal
winget install Microsoft.WindowsTerminal

# Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Performance Optimization

#### Development Mode
```bash
# Reduce resource usage
export NODE_OPTIONS="--max_old_space_size=4096"

# Use faster builds
npm run dev:fast

# Skip type checking during dev
export SKIP_TYPE_CHECK=true
```

#### Production Mode
```bash
# Build for production
npm run build:prod

# Start production servers
npm run start:prod

# Monitor resources
docker stats
```

---

## 📞 Support

### Getting Help
- **Documentation**: Check `/docs` folder
- **Issues**: GitHub Issues
- **Logs**: `docker-compose logs [service-name]`
- **Health Checks**: Visit `/health` endpoints

### Useful Commands
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f notification-service

# Check service health
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health

# Database CLI access
docker exec -it tempsdarret-mongodb mongosh
docker exec -it tempsdarret-redis redis-cli

# Reset everything
docker-compose down -v && docker-compose up -d
```

---

**🎉 You're all set! The complete Temps D'arrêt platform should now be running locally.**

For any issues or questions, check the troubleshooting section above or create an issue in the repository.