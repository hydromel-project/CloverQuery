#!/bin/bash

# CloverQuery Container Diagnostics
# Helps diagnose container issues

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

error() { echo -e "${RED}✗ $1${NC}"; }
success() { echo -e "${GREEN}✓ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
info() { echo -e "${BLUE}ℹ $1${NC}"; }

# Detect Docker Compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif docker-compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    error "Docker Compose is not available"
    exit 1
fi

echo "🔍 CloverQuery Container Diagnostics"
echo "====================================="
echo ""

cd "$PROJECT_DIR"

# Check 1: Docker and Docker Compose
info "Checking Docker environment..."
echo "Docker version: $(docker --version)"
echo "Compose version: $($DOCKER_COMPOSE_CMD version --short)"
echo "Docker Compose command: $DOCKER_COMPOSE_CMD"
echo ""

# Check 2: Project files
info "Checking project files..."
if [[ -f "docker-compose.yml" ]]; then
    success "docker-compose.yml exists"
else
    error "docker-compose.yml missing"
fi

if [[ -f ".env" ]]; then
    success ".env file exists"
else
    error ".env file missing - copy from .env.example"
fi

if [[ -f "Dockerfile" ]]; then
    success "Dockerfile exists"
else
    error "Dockerfile missing"
fi
echo ""

# Check 3: Container status
info "Checking container status..."
if $DOCKER_COMPOSE_CMD ps | grep -q "clover-query"; then
    success "Container exists"
    
    if $DOCKER_COMPOSE_CMD ps | grep -q "Up"; then
        success "Container is running"
        CONTAINER_RUNNING=true
    else
        warning "Container exists but is not running"
        CONTAINER_RUNNING=false
    fi
else
    warning "Container does not exist"
    CONTAINER_RUNNING=false
fi
echo ""

# Check 4: Container build status (if container exists)
if $DOCKER_COMPOSE_CMD ps | grep -q "clover-query"; then
    info "Container details:"
    $DOCKER_COMPOSE_CMD ps
    echo ""
fi

# Check 5: Node.js environment inside container (if running)
if [[ "$CONTAINER_RUNNING" == "true" ]]; then
    info "Checking Node.js environment inside container..."
    
    echo "Node.js version:"
    $DOCKER_COMPOSE_CMD exec -T app node --version || warning "Could not check Node.js version"
    
    echo "NPM version:"
    $DOCKER_COMPOSE_CMD exec -T app npm --version || warning "Could not check NPM version"
    
    echo "Checking tsx installation:"
    if $DOCKER_COMPOSE_CMD exec -T app which tsx &>/dev/null; then
        success "tsx is available in container"
    else
        error "tsx is NOT available in container"
        warning "This is likely why sync is failing"
    fi
    
    echo "Checking if node_modules exists:"
    if $DOCKER_COMPOSE_CMD exec -T app ls -la /app/node_modules | head -5; then
        success "node_modules directory exists"
    else
        error "node_modules directory missing"
    fi
    
    echo ""
    echo "Available NPM scripts:"
    $DOCKER_COMPOSE_CMD exec -T app npm run 2>/dev/null | grep -E "^\s+(sync|pdf|start)" || warning "Could not list npm scripts"
    
else
    warning "Cannot check Node.js environment - container not running"
fi
echo ""

# Check 6: Recent container logs
info "Recent container logs (last 20 lines):"
if [[ "$CONTAINER_RUNNING" == "true" ]]; then
    $DOCKER_COMPOSE_CMD logs --tail=20 app
else
    warning "No logs available - container not running"
fi
echo ""

# Recommendations
info "Recommendations:"
echo "=================="

if [[ "$CONTAINER_RUNNING" != "true" ]]; then
    echo "1. Start the container:"
    echo "   ./scripts/container-manager.sh start"
    echo ""
fi

if ! $DOCKER_COMPOSE_CMD images | grep -q "clover-query"; then
    echo "2. Build the container:"
    echo "   docker compose build"
    echo ""
fi

if [[ "$CONTAINER_RUNNING" == "true" ]] && ! $DOCKER_COMPOSE_CMD exec -T app which tsx &>/dev/null; then
    echo "3. Rebuild container to fix tsx issue:"
    echo "   docker compose build --no-cache"
    echo "   docker compose up -d"
    echo ""
fi

echo "4. Test sync manually once container is healthy:"
echo "   ./scripts/container-manager.sh sync-data"
echo ""

echo "5. If issues persist, check detailed logs:"
echo "   ./scripts/container-manager.sh logs 100"
echo ""

# Quick fix commands
info "Quick fix commands:"
echo "==================="
echo "# Complete rebuild:"
echo "docker compose down"
echo "docker compose build --no-cache"
echo "docker compose up -d"
echo ""
echo "# Check if it worked:"
echo "./scripts/container-manager.sh status"
echo "./scripts/container-manager.sh sync-data"