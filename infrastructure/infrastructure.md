# Infrastructure

## Overview
Self-hosted infrastructure setup for the photography portfolio platform. Focuses on cost-effective deployment while maintaining professional reliability and performance.

## Core Components
- **Containerization**: Docker for consistent deployment environments
- **Orchestration**: Docker Compose for local development and small-scale production
- **Reverse Proxy**: Nginx for SSL termination and static file serving
- **Monitoring**: Health checks and basic observability
- **Backup**: Automated data protection strategies

## Self-Hosted Architecture Benefits
- **Cost control**: No cloud storage fees for 150GB+ photo collections
- **Data sovereignty**: Complete control over client files and privacy
- **Performance**: Local file serving without bandwidth limitations
- **Customization**: Tailored infrastructure for photography workflows

## Technology Stack
- **Containers**: Docker and Docker Compose
- **Web Server**: Nginx reverse proxy
- **SSL**: Let's Encrypt with automatic renewal
- **Monitoring**: Custom health checks and logging
- **Backup**: Automated rsync and database dumps

## Directory Structure
```
infrastructure/
├── docker/            # Container configurations
│   ├── docker-compose.yml      # Production stack
│   ├── docker-compose.dev.yml  # Development stack
│   └── dockerfiles/            # Service-specific Dockerfiles
├── nginx/             # Reverse proxy configuration
│   ├── nginx.conf              # Main configuration
│   ├── sites/                  # Virtual host configs
│   └── ssl/                    # SSL certificate management
├── monitoring/        # Health checks and observability
├── backup/           # Backup scripts and configurations
└── scripts/          # Deployment and maintenance scripts
```

## Docker Compose Architecture

### **Production Stack**
```yaml
# infrastructure/docker/docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx:/etc/nginx
      - /var/www/portfolio-files:/var/www/portfolio-files:ro
  
  api-gateway:
    build: ../api-gateway
    environment:
      - NODE_ENV=production
  
  # All microservices
  user-service:
  file-service:
  event-service:
  # etc...
  
  mongodb:
    image: mongo:7
    volumes:
      - mongodb_data:/data/db
  
  kafka:
    image: confluentinc/cp-kafka:latest
    volumes:
      - kafka_data:/var/lib/kafka/data
```

### **Development Stack**
```yaml
# infrastructure/docker/docker-compose.dev.yml
# Lighter configuration with:
# - Volume mounts for live code reloading
# - Debug ports exposed
# - Development databases
# - Mock email services
```

## Nginx Configuration

### **SSL and Reverse Proxy**
```nginx
# infrastructure/nginx/sites/portfolio.conf
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # API routes to gateway
    location /api/ {
        proxy_pass http://api-gateway:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Static file serving with authentication
    location /files/ {
        auth_request /api/auth/validate-file-access;
        root /var/www/portfolio-files;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
        root /var/www/frontend;
    }
}
```

## Monitoring & Health Checks

### **Service Health Monitoring**
```bash
# infrastructure/monitoring/health-check.sh
#!/bin/bash
services=("api-gateway" "user-service" "file-service" "event-service")

for service in "${services[@]}"; do
    if curl -f "http://$service:3000/health" > /dev/null 2>&1; then
        echo "$service: healthy"
    else
        echo "$service: unhealthy" >&2
    fi
done
```

### **System Monitoring**
```bash
# Basic system health
check_disk_space() {
    df -h /var/www/portfolio-files | awk 'NR==2 {print "Storage: " $3 "/" $2 " (" $5 " used)"}'
}

check_memory() {
    free -h | awk 'NR==2 {print "Memory: " $3 "/" $2 " used"}'
}
```

## Backup Strategy

### **Automated Backup Script**
```bash
# infrastructure/backup/backup.sh
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Database backup
docker exec mongodb mongodump --out "$BACKUP_DIR/database"

# File system backup (incremental)
rsync -av --delete /var/www/portfolio-files/ "$BACKUP_DIR/files/"

# Configuration backup
cp -r infrastructure/ "$BACKUP_DIR/config/"

# Cleanup old backups (keep 30 days)
find /backup -type d -mtime +30 -exec rm -rf {} \;
```

### **Restore Procedures**
```bash
# infrastructure/backup/restore.sh
#!/bin/bash
BACKUP_DATE=$1

# Restore database
docker exec -i mongodb mongorestore "/backup/$BACKUP_DATE/database"

# Restore files
rsync -av "/backup/$BACKUP_DATE/files/" /var/www/portfolio-files/
```

## Deployment Scripts

### **Production Deployment**
```bash
# infrastructure/scripts/deploy.sh
#!/bin/bash
set -e

echo "Starting deployment..."

# Pull latest code
git pull origin main

# Build services
docker-compose -f infrastructure/docker/docker-compose.yml build

# Update with zero downtime
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Health check
./infrastructure/monitoring/health-check.sh

echo "Deployment complete!"
```

### **SSL Certificate Management**
```bash
# infrastructure/scripts/ssl-setup.sh
#!/bin/bash
# Automated Let's Encrypt setup with renewal
certbot --nginx -d your-domain.com
echo "0 2 * * * certbot renew --quiet" | crontab -
```

## Security Configuration

### **Firewall Setup**
```bash
# Basic UFW configuration
ufw allow 22    # SSH
ufw allow 80    # HTTP (redirects to HTTPS)
ufw allow 443   # HTTPS
ufw enable
```

### **Environment Variables**
```env
# .env.production
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret
DB_PASSWORD=your-secure-db-password
MAGIC_LINK_SECRET=your-magic-link-secret
SSL_EMAIL=your-email@domain.com
```

## Development vs Production

### **Development Environment**
- Hot reloading for all services
- Mock email service (no real emails sent)
- Relaxed security for faster development
- Local file storage with sample images

### **Production Environment**
- Optimized container images
- SSL termination with automatic renewal
- Production security headers
- Real email service integration
- Automated backups and monitoring

## Implementation Phases

### Phase 1: Basic Infrastructure
- [ ] Set up Docker Compose for all services
- [ ] Configure Nginx reverse proxy
- [ ] Implement SSL with Let's Encrypt
- [ ] Create basic health monitoring
- [ ] Set up automated backups

### Phase 2: Production Hardening
- [ ] Implement security best practices
- [ ] Add comprehensive monitoring
- [ ] Create deployment automation
- [ ] Set up log aggregation
- [ ] Add performance optimization

### Phase 3: Operations & Maintenance
- [ ] Create maintenance scripts
- [ ] Implement automated updates
- [ ] Add business metrics monitoring
- [ ] Create disaster recovery procedures
- [ ] Add capacity planning tools

## Cost Benefits
- **No cloud fees**: Avoid monthly storage costs for large photo collections
- **Simple scaling**: Add storage as needed
- **Full control**: Custom optimization for photography workflows
- **Privacy**: Client files never leave your infrastructure