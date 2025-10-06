#!/bin/bash
# Kong Gateway Setup Script
# Sets up Kong Gateway and configures all microservices

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Setting up Kong API Gateway..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create microservices network if it doesn't exist
echo "📡 Creating microservices network..."
docker network create tempsdarret_microservices 2>/dev/null || echo "Network already exists"

# Start Kong stack
echo "🐘 Starting Kong Gateway stack..."
docker-compose up -d

# Wait for Kong to be ready
echo "⏳ Waiting for Kong to be ready..."
timeout=60
counter=0
until curl -s http://localhost:8001/status > /dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        echo "❌ Timeout waiting for Kong to start"
        docker-compose logs kong
        exit 1
    fi
    echo "Waiting... ($counter/$timeout)"
    sleep 2
    counter=$((counter+1))
done

echo "✅ Kong Gateway is ready!"

# Display Kong status
echo ""
echo "📊 Kong Status:"
curl -s http://localhost:8001/status | jq '.'

echo ""
echo "✅ Kong API Gateway setup complete!"
echo ""
echo "📍 Kong endpoints:"
echo "   - HTTP Proxy:    http://localhost:8000"
echo "   - HTTPS Proxy:   https://localhost:8443"
echo "   - Admin API:     http://localhost:8001"
echo "   - Kong Manager:  http://localhost:8002"
echo ""
echo "🔧 Next steps:"
echo "   1. Configure services: ./configure-services.sh"
echo "   2. Test routes: ./test-routes.sh"
echo "   3. View logs: docker-compose logs -f kong"
echo ""
