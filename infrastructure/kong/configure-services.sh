#!/bin/bash
# Configure Kong Services and Routes
# Registers all microservices with Kong Gateway

set -e

ADMIN_API="http://localhost:8001"

echo "🔧 Configuring Kong services and routes..."

# Function to create service
create_service() {
    local name=$1
    local url=$2

    echo "Creating service: $name ($url)"
    curl -i -X POST "$ADMIN_API/services" \
        --data "name=$name" \
        --data "url=$url" \
        --data "retries=3" \
        --data "connect_timeout=60000" \
        --data "read_timeout=60000" \
        --data "write_timeout=60000" \
        2>/dev/null || echo "Service $name may already exist"
}

# Function to create route
create_route() {
    local service=$1
    local name=$2
    shift 2
    local paths=("$@")

    echo "Creating route: $name for service $service"

    # Build paths parameter
    paths_param=""
    for path in "${paths[@]}"; do
        paths_param="$paths_param --data paths[]=$path"
    done

    curl -i -X POST "$ADMIN_API/services/$service/routes" \
        --data "name=$name" \
        $paths_param \
        --data "strip_path=false" \
        --data "preserve_host=false" \
        2>/dev/null || echo "Route $name may already exist"
}

# Function to add plugin
add_plugin() {
    local scope=$1
    local scope_name=$2
    local plugin=$3
    shift 3
    local config=("$@")

    echo "Adding plugin: $plugin to $scope $scope_name"

    # Build config parameters
    config_param=""
    for cfg in "${config[@]}"; do
        config_param="$config_param --data $cfg"
    done

    curl -i -X POST "$ADMIN_API/$scope/$scope_name/plugins" \
        --data "name=$plugin" \
        $config_param \
        2>/dev/null || echo "Plugin $plugin may already exist"
}

# Create services
echo ""
echo "📦 Creating services..."
create_service "user-service" "http://user-service:3002"
create_service "invite-service" "http://invite-service:3003"
create_service "portfolio-service" "http://portfolio-service:3004"
create_service "shoot-service" "http://shoot-service:3005"
create_service "file-service" "http://file-service:3006"
create_service "notification-service" "http://notification-service:3007"

# Create routes
echo ""
echo "🛣️  Creating routes..."
create_route "user-service" "user-service-route" "/api/v1/users"
create_route "invite-service" "invite-service-invitations" "/api/v1/invitations"
create_route "invite-service" "invite-service-magic-links" "/api/v1/magic-links"
create_route "portfolio-service" "portfolio-service-portfolios" "/api/v1/portfolios"
create_route "portfolio-service" "portfolio-service-galleries" "/api/v1/galleries"
create_route "shoot-service" "shoot-service-route" "/api/v1/shoots"
create_route "file-service" "file-service-route" "/api/v1/files"
create_route "notification-service" "notification-service-route" "/api/v1/notifications"

# Add global plugins
echo ""
echo "🔌 Adding global plugins..."

# CORS
curl -i -X POST "$ADMIN_API/plugins" \
    --data "name=cors" \
    --data "config.origins=http://localhost:5173" \
    --data "config.origins=http://localhost:3000" \
    --data "config.origins=https://tempsdarret.studio" \
    --data "config.methods=GET" \
    --data "config.methods=POST" \
    --data "config.methods=PUT" \
    --data "config.methods=PATCH" \
    --data "config.methods=DELETE" \
    --data "config.methods=OPTIONS" \
    --data "config.headers=Accept" \
    --data "config.headers=Authorization" \
    --data "config.headers=Content-Type" \
    --data "config.headers=X-Request-ID" \
    --data "config.exposed_headers=X-Request-ID" \
    --data "config.exposed_headers=X-RateLimit-Limit" \
    --data "config.exposed_headers=X-RateLimit-Remaining" \
    --data "config.credentials=true" \
    --data "config.max_age=3600" \
    2>/dev/null || echo "CORS plugin may already exist"

# Request ID (correlation-id)
curl -i -X POST "$ADMIN_API/plugins" \
    --data "name=correlation-id" \
    --data "config.header_name=X-Request-ID" \
    --data "config.generator=uuid" \
    --data "config.echo_downstream=true" \
    2>/dev/null || echo "Correlation-ID plugin may already exist"

# Rate limiting
curl -i -X POST "$ADMIN_API/plugins" \
    --data "name=rate-limiting" \
    --data "config.minute=100" \
    --data "config.hour=1000" \
    --data "config.policy=local" \
    --data "config.fault_tolerant=true" \
    --data "config.hide_client_headers=false" \
    2>/dev/null || echo "Rate limiting plugin may already exist"

# Request size limiting
curl -i -X POST "$ADMIN_API/plugins" \
    --data "name=request-size-limiting" \
    --data "config.allowed_payload_size=100" \
    --data "config.size_unit=megabytes" \
    --data "config.require_content_length=false" \
    2>/dev/null || echo "Request size limiting plugin may already exist"

echo ""
echo "✅ Kong configuration complete!"
echo ""
echo "📋 Summary:"
curl -s "$ADMIN_API/services" | jq '.data | length' | xargs echo "   - Services:"
curl -s "$ADMIN_API/routes" | jq '.data | length' | xargs echo "   - Routes:"
curl -s "$ADMIN_API/plugins" | jq '.data | length' | xargs echo "   - Plugins:"
echo ""
