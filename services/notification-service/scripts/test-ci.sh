#!/bin/bash
#
# CI Test Script for Notification Service
# Runs the complete test suite in CI environment
#

set -e

echo "🧪 Starting Notification Service CI Tests..."

# Set test environment
export NODE_ENV=test
export LOG_LEVEL=error
export TEMPLATE_CACHE_SIZE=100
export MAX_RETRY_ATTEMPTS=3
export NOTIFICATION_TIMEOUT=5000

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from notification-service directory"
    exit 1
fi

# Check if required commands are available
command -v node >/dev/null 2>&1 || { echo "❌ Error: Node.js is required but not installed" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ Error: npm is required but not installed" >&2; exit 1; }

echo "📦 Installing dependencies..."
npm ci --silent

echo "🔍 Running TypeScript check..."
npm run check

echo "🧹 Running linter..."
npm run lint

echo "🧪 Running unit tests..."
npm run test:unit

echo "🧪 Running component tests..."
npm run test:component

echo "🧪 Running integration tests..."
npm run test:integration

echo "📊 Generating coverage report..."
npm run test:coverage

echo "⚡ Running performance tests..."
npm run test:performance

echo "✅ All tests passed successfully!"

# Check coverage thresholds
if [ -f "coverage/coverage-summary.json" ]; then
    echo "📊 Coverage Summary:"
    node -e "
        const coverage = require('./coverage/coverage-summary.json').total;
        console.log(\`  Lines: \${coverage.lines.pct}%\`);
        console.log(\`  Functions: \${coverage.functions.pct}%\`);
        console.log(\`  Branches: \${coverage.branches.pct}%\`);
        console.log(\`  Statements: \${coverage.statements.pct}%\`);
        
        if (coverage.lines.pct < 85 || coverage.functions.pct < 85 || 
            coverage.branches.pct < 80 || coverage.statements.pct < 85) {
            console.log('❌ Coverage thresholds not met');
            process.exit(1);
        } else {
            console.log('✅ Coverage thresholds met');
        }
    "
fi

echo "🎉 CI test suite completed successfully!"