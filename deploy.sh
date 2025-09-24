#!/bin/bash

# Excalidraw Deployment Script for excalidraw.faku.pro
# This script builds and deploys Excalidraw using Docker

set -e

echo "🚀 Starting Excalidraw deployment for excalidraw.faku.pro"
echo ""

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Installing..."
    if command -v pip &> /dev/null; then
        pip install docker-compose
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y docker-compose
    else
        echo "Please install docker-compose manually and run this script again."
        exit 1
    fi
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Pull latest changes (optional - uncomment if using git)
# echo "📥 Pulling latest changes..."
# git pull origin main

# Build and start the containers
echo "🏗️  Building Excalidraw..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for containers to be healthy
echo "⏳ Waiting for containers to start..."
sleep 10

# Check container status
echo "📊 Container status:"
docker-compose -f docker-compose.prod.yml ps

# Test if the application is responding
echo "🧪 Testing application..."
sleep 5
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Application is responding!"
else
    echo "⚠️  Application might not be ready yet. Check logs with:"
    echo "   docker-compose -f docker-compose.prod.yml logs"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Your Excalidraw instance is now running at:"
echo "   Local: http://localhost"
echo "   Domain: https://excalidraw.faku.pro (once DNS is configured)"
echo ""
echo "Useful commands:"
echo "   View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop: docker-compose -f docker-compose.prod.yml down"
echo "   Restart: docker-compose -f docker-compose.prod.yml restart"
echo "   Update: ./deploy.sh"
echo ""
echo "Make sure to:"
echo "1. Point excalidraw.faku.pro DNS A record to your server IP"
echo "2. Configure Cloudflare proxy (orange cloud) for SSL termination"