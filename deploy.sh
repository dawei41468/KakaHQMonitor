#!/bin/bash

# KakaHQMonitor Deployment Script
# Run this script on your server after committing changes locally

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the project directory?"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
if git pull origin main; then
    print_status "Git pull successful"
else
    print_error "Git pull failed"
    exit 1
fi

# Check if package.json changed
if git diff HEAD~1 --name-only | grep -q "package.json\|package-lock.json"; then
    print_warning "Dependencies changed, running npm install..."
    if npm install; then
        print_status "Dependencies installed"
    else
        print_error "npm install failed"
        exit 1
    fi
else
    print_status "No dependency changes detected"
fi

# Build the application
echo "🔨 Building application..."
if npm run build; then
    print_status "Build successful"
else
    print_error "Build failed"
    exit 1
fi

# Restart the application
echo "🔄 Restarting application..."
if pm2 restart kaka-api; then
    print_status "Application restarted"
else
    print_error "Failed to restart application"
    exit 1
fi

# Show status
echo "📊 Deployment status:"
pm2 list | grep kaka-api

echo ""
print_status "🎉 Deployment completed successfully!"
echo "Your application is now running with the latest changes."
