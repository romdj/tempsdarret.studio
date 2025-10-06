#!/bin/bash
# Test Kong Routes
# Verifies that all microservice routes are working through Kong

set -e

KONG_URL="http://localhost:8000"
ADMIN_API="http://localhost:8001"

echo "🧪 Testing Kong routes..."
echo ""

# Function to test route
test_route() {
    local path=$1
    local description=$2

    echo "Testing: $description"
    echo "   URL: $KONG_URL$path"

    response=$(curl -s -w "\n%{http_code}" "$KONG_URL$path" 2>/dev/null || echo "000")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" = "404" ]; then
        echo "   ❌ Route not found (404)"
        return 1
    elif [ "$status" = "503" ]; then
        echo "   ⚠️  Service unavailable (503) - Upstream service may not be running"
        return 0
    elif [ "$status" = "000" ]; then
        echo "   ❌ Connection failed - Kong may not be running"
        return 1
    else
        echo "   ✅ Route configured (HTTP $status)"

        # Check for request ID header
        request_id=$(curl -s -I "$KONG_URL$path" 2>/dev/null | grep -i "X-Request-ID" || echo "")
        if [ -n "$request_id" ]; then
            echo "   ✅ Request ID header present"
        fi
        return 0
    fi
    echo ""
}

# Check if Kong is running
echo "Checking Kong status..."
if ! curl -s "$ADMIN_API/status" > /dev/null 2>&1; then
    echo "❌ Kong Admin API is not accessible at $ADMIN_API"
    echo "   Please run ./setup.sh first"
    exit 1
fi
echo "✅ Kong is running"
echo ""

# Test all service routes
echo "Testing service routes:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_route "/api/v1/users" "User Service"
test_route "/api/v1/invitations" "Invite Service (Invitations)"
test_route "/api/v1/magic-links" "Invite Service (Magic Links)"
test_route "/api/v1/portfolios" "Portfolio Service (Portfolios)"
test_route "/api/v1/galleries" "Portfolio Service (Galleries)"
test_route "/api/v1/shoots" "Shoot Service"
test_route "/api/v1/files" "File Service"
test_route "/api/v1/notifications" "Notification Service"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Display service statuses
echo "📊 Kong Services Status:"
curl -s "$ADMIN_API/services" | jq -r '.data[] | "   - \(.name): \(.host)"'

echo ""
echo "📊 Active Routes:"
curl -s "$ADMIN_API/routes" | jq -r '.data[] | "   - \(.name): \(.paths[])"'

echo ""
echo "📊 Active Plugins:"
curl -s "$ADMIN_API/plugins" | jq -r '.data[] | "   - \(.name) (\(.enabled))"'

echo ""
echo "✅ Route testing complete!"
echo ""
echo "💡 Tips:"
echo "   - If routes return 503, ensure microservices are running"
echo "   - Check Kong logs: docker-compose logs -f kong"
echo "   - View Kong Manager: http://localhost:8002"
echo ""
