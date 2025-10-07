#!/bin/bash
# Temps D'arrêt Platform Startup Script
# Ensures all services route through Kong Gateway

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Temps D'arrêt Platform..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env with your configuration:"
    echo "   - RESEND_API_KEY: Get from https://resend.com/api-keys"
    echo "   - RESEND_FROM_EMAIL: Your verified email address"
    echo "   - PAYLOAD_SECRET: Generate with 'openssl rand -base64 32'"
    echo ""
    echo "After configuration, run this script again."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "📦 Starting all services with Docker Compose..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."

# Wait for Kong to be ready
timeout=120
counter=0
until docker-compose exec -T kong kong health > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        echo "❌ Timeout waiting for Kong Gateway to start"
        echo "Check logs with: docker-compose logs kong"
        exit 1
    fi
    echo -n "."
    sleep 2
    counter=$((counter+2))
done

echo ""
echo "✅ Kong Gateway is healthy!"

# Configure Kong services and routes
echo ""
echo "🔧 Configuring Kong Gateway services and routes..."
cd infrastructure/kong

# Check if services are already configured
services_count=$(curl -s http://localhost:8001/services 2>/dev/null | grep -o '"data":\[' | wc -l || echo "0")

if [ "$services_count" -eq "0" ] || [ $(curl -s http://localhost:8001/services | grep -c '"id"') -lt 6 ]; then
    echo "Registering microservices with Kong..."
    ./configure-services.sh > /dev/null 2>&1
    echo "✅ Kong configuration complete!"
else
    echo "✅ Kong services already configured"
fi

cd "$SCRIPT_DIR"

echo ""
echo "🧪 Testing Kong routes..."
cd infrastructure/kong
./test-routes.sh

cd "$SCRIPT_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Temps D'arrêt Platform is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access Points:"
echo "   API Gateway (All Services): http://localhost:8000"
echo "   Kong Admin API:             http://localhost:8001"
echo "   Frontend:                   http://localhost:5173"
echo ""
echo "📚 API Endpoints (via Kong Gateway):"
echo "   POST   http://localhost:8000/api/v1/users"
echo "   POST   http://localhost:8000/api/v1/invitations"
echo "   GET    http://localhost:8000/api/v1/portfolios"
echo "   POST   http://localhost:8000/api/v1/shoots"
echo "   POST   http://localhost:8000/api/v1/files/upload"
echo "   GET    http://localhost:8000/api/v1/notifications"
echo ""
echo "🔍 Monitoring:"
echo "   docker-compose ps              # Service status"
echo "   docker-compose logs -f         # All logs"
echo "   docker-compose logs -f kong    # Kong Gateway logs"
echo ""
echo "⚠️  IMPORTANT: All API traffic MUST go through Kong Gateway (port 8000)"
echo "   Microservices are NOT exposed externally for security."
echo ""
echo "📖 For more information, see SETUP.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
