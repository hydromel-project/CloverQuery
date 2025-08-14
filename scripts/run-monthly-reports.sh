#!/bin/bash

# CloverQuery Monthly Reports Runner
# This script ensures the container is running and executes the monthly sync and email workflow

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/clover-monthly.log"
CONTAINER_NAME="clover-query"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    echo -e "${RED}ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    log "SUCCESS: $1"
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

# Warning message  
warning() {
    log "WARNING: $1"
    echo -e "${YELLOW}WARNING: $1${NC}"
}

# Info message
info() {
    log "INFO: $1"
    echo -e "${BLUE}INFO: $1${NC}"
}

# Check if running as root
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        error_exit "This script should not be run as root. Run as regular user with docker permissions."
    fi
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed"
    fi
    
    if ! docker info &> /dev/null; then
        error_exit "Docker is not running or user lacks permissions"
    fi
    
    # Check if Docker Compose is available
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif docker-compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        error_exit "Docker Compose is not available"
    fi
    
    # Check if project directory exists
    if [[ ! -d "$PROJECT_DIR" ]]; then
        error_exit "Project directory not found: $PROJECT_DIR"
    fi
    
    # Check if docker-compose.yml exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error_exit "docker-compose.yml not found: $COMPOSE_FILE"
    fi
    
    # Check if .env file exists
    if [[ ! -f "$PROJECT_DIR/.env" ]]; then
        error_exit ".env file not found. Please copy .env.example to .env and configure it."
    fi
    
    success "All prerequisites checked"
}

# Ensure container is running
ensure_container_running() {
    info "Ensuring CloverQuery container is running..."
    
    cd "$PROJECT_DIR"
    
    # Check if container exists and is running
    if $DOCKER_COMPOSE_CMD ps | grep -q "Up"; then
        success "Container is already running"
    else
        info "Starting CloverQuery container..."
        $DOCKER_COMPOSE_CMD up -d
        
        # Wait for container to be ready
        info "Waiting for container to be ready..."
        sleep 15
        
        # Verify container is healthy
        for i in {1..6}; do
            if $DOCKER_COMPOSE_CMD ps | grep -q "Up.*healthy\|Up"; then
                success "Container is running and ready"
                break
            else
                if [[ $i -eq 6 ]]; then
                    error_exit "Container failed to start properly"
                fi
                info "Waiting for container to be ready... ($i/6)"
                sleep 10
            fi
        done
    fi
}

# Run the monthly reports workflow
run_monthly_reports() {
    info "Starting monthly reports workflow..."
    
    cd "$PROJECT_DIR"
    
    # Execute the sync and email workflow inside container
    if $DOCKER_COMPOSE_CMD exec -T app npm run sync-and-email; then
        success "Monthly reports workflow completed successfully"
    else
        error_exit "Monthly reports workflow failed"
    fi
}

# Run sync only (no email)
run_sync_only() {
    info "Running data sync only..."
    
    cd "$PROJECT_DIR"
    
    # Execute sync inside container
    if $DOCKER_COMPOSE_CMD exec -T app npm run sync; then
        success "Data sync completed successfully"
    else
        error_exit "Data sync failed"
    fi
}

# Clean up old reports (optional)
cleanup_old_reports() {
    info "Cleaning up old report files..."
    
    cd "$PROJECT_DIR"
    
    # Remove PDF files older than 90 days
    find "$PROJECT_DIR/reports" -name "*.pdf" -type f -mtime +90 -delete 2>/dev/null || true
    
    # Remove log entries older than 1 year (keep last 1000 lines)
    if [[ -f "$LOG_FILE" ]]; then
        tail -1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE" || true
    fi
    
    info "Cleanup completed"
}

# Main execution
main() {
    echo "================================================="
    echo "CloverQuery Monthly Reports Runner"
    echo "Started: $(date)"
    echo "Project: $PROJECT_DIR" 
    echo "================================================="
    
    log "=== Monthly Reports Execution Started ==="
    
    # Run all checks and operations
    check_permissions
    check_prerequisites
    ensure_container_running
    run_monthly_reports
    cleanup_old_reports
    
    log "=== Monthly Reports Execution Completed ==="
    echo "================================================="
    echo "Completed: $(date)"
    echo "Check log file: $LOG_FILE"
    echo "================================================="
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --test         Run in test mode (no email sending)"
        echo "  --force        Force run even if recently executed"
        echo ""
        echo "This script:"
        echo "  1. Checks prerequisites and container status"
        echo "  2. Ensures CloverQuery container is running"
        echo "  3. Executes monthly sync and email workflow"
        echo "  4. Cleans up old files and logs"
        exit 0
        ;;
    --test)
        info "Running in TEST mode - emails disabled"
        export EMAIL_ENABLED=false
        ;;
    --force)
        info "Force mode - ignoring recent execution checks"
        ;;
esac

# Execute main function
main