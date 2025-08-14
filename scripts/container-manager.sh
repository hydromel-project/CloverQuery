#!/bin/bash

# CloverQuery Container Manager
# Utility script for managing the CloverQuery Docker container

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTAINER_NAME="clover-query"
LOG_FILE="/var/log/clover-manager.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Colored output functions
error() { echo -e "${RED}ERROR: $1${NC}"; }
success() { echo -e "${GREEN}SUCCESS: $1${NC}"; }
warning() { echo -e "${YELLOW}WARNING: $1${NC}"; }
info() { echo -e "${BLUE}INFO: $1${NC}"; }

# Change to project directory
cd "$PROJECT_DIR"

# Function to show status
show_status() {
    info "CloverQuery Container Status:"
    echo "================================"
    
    if docker compose ps | grep -q "$CONTAINER_NAME"; then
        docker compose ps
        echo ""
        
        # Show resource usage
        info "Resource Usage:"
        docker stats "$CONTAINER_NAME" --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || true
        echo ""
        
        # Show recent logs
        info "Recent logs (last 10 lines):"
        docker compose logs --tail=10 app
    else
        warning "Container is not running"
    fi
}

# Function to start container
start_container() {
    info "Starting CloverQuery container..."
    
    if docker compose ps | grep -q "Up"; then
        warning "Container is already running"
        return 0
    fi
    
    docker compose up -d
    sleep 5
    
    if docker compose ps | grep -q "Up"; then
        success "Container started successfully"
        show_status
    else
        error "Failed to start container"
        docker compose logs app
        exit 1
    fi
}

# Function to stop container
stop_container() {
    info "Stopping CloverQuery container..."
    
    if ! docker compose ps | grep -q "Up"; then
        warning "Container is not running"
        return 0
    fi
    
    docker compose stop
    success "Container stopped"
}

# Function to restart container
restart_container() {
    info "Restarting CloverQuery container..."
    docker compose restart
    sleep 5
    
    if docker compose ps | grep -q "Up"; then
        success "Container restarted successfully"
    else
        error "Failed to restart container"
        exit 1
    fi
}

# Function to update container
update_container() {
    info "Updating CloverQuery container..."
    
    # Pull latest code
    info "Pulling latest code..."
    git pull origin main
    
    # Rebuild and restart
    info "Rebuilding container..."
    docker compose build --no-cache
    
    info "Restarting with new image..."
    docker compose up -d
    
    sleep 10
    
    if docker compose ps | grep -q "Up"; then
        success "Container updated and restarted successfully"
        show_status
    else
        error "Failed to update container"
        docker compose logs app
        exit 1
    fi
}

# Function to show logs
show_logs() {
    local lines=${1:-50}
    info "Showing last $lines lines of logs:"
    docker compose logs --tail="$lines" -f app
}

# Function to run manual sync
manual_sync() {
    info "Running manual sync and email..."
    
    if ! docker compose ps | grep -q "Up"; then
        error "Container is not running. Start it first with: $0 start"
        exit 1
    fi
    
    docker compose exec app npm run sync-and-email
}

# Function to run individual reports
run_report() {
    local report_type=$1
    
    if [[ -z "$report_type" ]]; then
        error "Report type required. Options: expired, expiring, action"
        exit 1
    fi
    
    if ! docker compose ps | grep -q "Up"; then
        error "Container is not running. Start it first with: $0 start"
        exit 1
    fi
    
    case "$report_type" in
        expired)
            docker compose exec app npm run pdf:expired
            ;;
        expiring)
            docker compose exec app npm run pdf:expiring
            ;;
        action)
            docker compose exec app npm run pdf:action
            ;;
        *)
            error "Invalid report type. Options: expired, expiring, action"
            exit 1
            ;;
    esac
}

# Function to access container shell
shell_access() {
    info "Opening shell in CloverQuery container..."
    
    if ! docker compose ps | grep -q "Up"; then
        error "Container is not running. Start it first with: $0 start"
        exit 1
    fi
    
    docker compose exec app bash
}

# Function to cleanup
cleanup() {
    info "Cleaning up Docker resources..."
    
    # Remove unused containers, networks, images
    docker system prune -f
    
    # Remove old report files
    find "$PROJECT_DIR/reports" -name "*.pdf" -type f -mtime +90 -delete 2>/dev/null || true
    
    success "Cleanup completed"
}

# Function to backup data
backup_data() {
    local backup_dir="/tmp/clover-backup-$(date +%Y%m%d-%H%M%S)"
    
    info "Creating backup in $backup_dir..."
    
    mkdir -p "$backup_dir"
    
    # Backup database
    cp -r "$PROJECT_DIR/data" "$backup_dir/" 2>/dev/null || true
    
    # Backup recent reports
    cp -r "$PROJECT_DIR/reports" "$backup_dir/" 2>/dev/null || true
    
    # Backup configuration
    cp "$PROJECT_DIR/.env" "$backup_dir/" 2>/dev/null || true
    
    # Create archive
    tar -czf "$backup_dir.tar.gz" -C "/tmp" "$(basename "$backup_dir")"
    rm -rf "$backup_dir"
    
    success "Backup created: $backup_dir.tar.gz"
}

# Function to show health check
health_check() {
    info "CloverQuery Health Check:"
    echo "=========================="
    
    # Container status
    if docker compose ps | grep -q "Up"; then
        success "✓ Container is running"
    else
        error "✗ Container is not running"
    fi
    
    # Database check
    if [[ -f "$PROJECT_DIR/data/dev.db" ]]; then
        success "✓ Database file exists"
    else
        warning "⚠ Database file not found"
    fi
    
    # Configuration check
    if [[ -f "$PROJECT_DIR/.env" ]]; then
        success "✓ Configuration file exists"
        
        # Check key variables
        if grep -q "EMAIL_ENABLED=true" "$PROJECT_DIR/.env"; then
            success "✓ Email is enabled"
        else
            warning "⚠ Email is disabled"
        fi
        
        if grep -q "CLOVER_.*_API_TOKEN=" "$PROJECT_DIR/.env"; then
            success "✓ Clover API tokens configured"
        else
            warning "⚠ Clover API tokens may not be configured"
        fi
    else
        error "✗ Configuration file missing"
    fi
    
    # Network connectivity
    if docker compose exec app curl -s --max-time 10 https://api.clover.com > /dev/null 2>&1; then
        success "✓ Clover API connectivity"
    else
        warning "⚠ Cannot reach Clover API"
    fi
    
    echo "=========================="
}

# Show usage
show_usage() {
    echo "CloverQuery Container Manager"
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  status              Show container status and resource usage"
    echo "  start               Start the container"
    echo "  stop                Stop the container"
    echo "  restart             Restart the container"
    echo "  update              Pull latest code and rebuild container"
    echo "  logs [lines]        Show container logs (default: 50 lines)"
    echo "  sync                Run manual sync and email workflow"
    echo "  report <type>       Generate specific report (expired|expiring|action)"
    echo "  shell               Access container shell"
    echo "  health              Run health check"
    echo "  cleanup             Clean up old files and Docker resources"
    echo "  backup              Create backup of data and configuration"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 logs 100"
    echo "  $0 report expired"
    echo "  $0 sync"
}

# Main script logic
case "${1:-}" in
    status)
        show_status
        ;;
    start)
        start_container
        ;;
    stop)
        stop_container
        ;;
    restart)
        restart_container
        ;;
    update)
        update_container
        ;;
    logs)
        show_logs "${2:-50}"
        ;;
    sync)
        manual_sync
        ;;
    report)
        run_report "$2"
        ;;
    shell)
        shell_access
        ;;
    health)
        health_check
        ;;
    cleanup)
        cleanup
        ;;
    backup)
        backup_data
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        error "Invalid command: ${1:-}"
        echo ""
        show_usage
        exit 1
        ;;
esac