#!/bin/bash

# CloverQuery Health Monitor
# Monitors container health and automatically restarts if needed

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTAINER_NAME="clover-query"
LOG_FILE="/var/log/clover-health.log"
ALERT_EMAIL="${ALERT_EMAIL:-info@umatek.com}"
MAX_RESTART_ATTEMPTS=3
RESTART_COOLDOWN=300  # 5 minutes between restart attempts

# Detect Docker Compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif docker-compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    error "Docker Compose is not available"
    exit 1
fi

# Lock file to prevent multiple instances
LOCK_FILE="/tmp/clover-health-monitor.lock"

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
error() { echo -e "${RED}ERROR: $1${NC}"; log "ERROR: $1"; }
success() { echo -e "${GREEN}SUCCESS: $1${NC}"; log "SUCCESS: $1"; }
warning() { echo -e "${YELLOW}WARNING: $1${NC}"; log "WARNING: $1"; }
info() { echo -e "${BLUE}INFO: $1${NC}"; log "INFO: $1"; }

# Create lock file
create_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local pid
        pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            info "Health monitor already running (PID: $pid)"
            exit 0
        else
            warning "Removing stale lock file"
            rm -f "$LOCK_FILE"
        fi
    fi
    
    echo $$ > "$LOCK_FILE"
    trap 'rm -f "$LOCK_FILE"; exit' INT TERM EXIT
}

# Change to project directory
cd "$PROJECT_DIR"

# Check if container exists
check_container_exists() {
    if ! $DOCKER_COMPOSE_CMD ps -q app &>/dev/null; then
        warning "CloverQuery container does not exist"
        return 1
    fi
    return 0
}

# Check if container is running
check_container_running() {
    if $DOCKER_COMPOSE_CMD ps | grep -q "Up"; then
        return 0
    else
        return 1
    fi
}

# Check container health
check_container_health() {
    local health_status
    
    # Check if container responds to HTTP
    if $DOCKER_COMPOSE_CMD exec -T app curl -sf http://localhost:3000/ >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check system resources
check_system_resources() {
    local cpu_usage mem_usage disk_usage
    
    # Get system metrics
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    mem_usage=$(free | grep Mem | awk '{printf("%.1f"), $3/$2 * 100.0}')
    disk_usage=$(df "$PROJECT_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    log "METRICS: CPU: ${cpu_usage}%, Memory: ${mem_usage}%, Disk: ${disk_usage}%"
    
    # Alert on high resource usage
    if (( $(echo "$cpu_usage > 90" | bc -l) )); then
        warning "High CPU usage: ${cpu_usage}%"
    fi
    
    if (( $(echo "$mem_usage > 90" | bc -l) )); then
        warning "High memory usage: ${mem_usage}%"
    fi
    
    if (( disk_usage > 90 )); then
        warning "High disk usage: ${disk_usage}%"
    fi
}

# Restart container with backoff
restart_container() {
    local attempt=$1
    
    if [[ $attempt -gt $MAX_RESTART_ATTEMPTS ]]; then
        error "Maximum restart attempts reached. Manual intervention required."
        send_alert "CloverQuery container failed to start after $MAX_RESTART_ATTEMPTS attempts"
        return 1
    fi
    
    warning "Restarting container (attempt $attempt/$MAX_RESTART_ATTEMPTS)..."
    
    # Stop container gracefully
    $DOCKER_COMPOSE_CMD stop app || true
    sleep 10
    
    # Start container
    if $DOCKER_COMPOSE_CMD up -d app; then
        sleep 15
        
        # Verify it's working
        if check_container_health; then
            success "Container restarted successfully"
            log "RESTART: Container recovered after $attempt attempts"
            return 0
        else
            error "Container started but health check failed"
            sleep $RESTART_COOLDOWN
            restart_container $((attempt + 1))
        fi
    else
        error "Failed to start container"
        sleep $RESTART_COOLDOWN
        restart_container $((attempt + 1))
    fi
}

# Send alert (placeholder - implement according to your needs)
send_alert() {
    local message="$1"
    local subject="CloverQuery Alert - $(hostname)"
    
    log "ALERT: $message"
    
    # Option 1: Log to system log
    logger -t "clover-health" "$message"
    
    # Option 2: Send email via local mail system (if configured)
    # echo "$message" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || true
    
    # Option 3: Write to alert file
    echo "[$(date)] $message" >> "/tmp/clover-alerts.log"
}

# Main health check function
perform_health_check() {
    info "Starting health check..."
    
    # Check if container exists
    if ! check_container_exists; then
        warning "Container does not exist, creating..."
        $DOCKER_COMPOSE_CMD up -d app
        sleep 15
    fi
    
    # Check if container is running
    if ! check_container_running; then
        warning "Container is not running"
        restart_container 1
        return
    fi
    
    # Check container health
    if ! check_container_health; then
        warning "Container health check failed"
        restart_container 1
        return
    fi
    
    # Check system resources
    check_system_resources
    
    success "Health check passed"
}

# Cleanup old logs
cleanup_logs() {
    # Keep last 1000 lines of health log
    if [[ -f "$LOG_FILE" ]] && [[ $(wc -l < "$LOG_FILE") -gt 1000 ]]; then
        tail -1000 "$LOG_FILE" > "${LOG_FILE}.tmp"
        mv "${LOG_FILE}.tmp" "$LOG_FILE"
    fi
    
    # Clean old alert logs
    find /tmp -name "clover-alerts.log" -mtime +30 -delete 2>/dev/null || true
}

# Show monitoring status
show_status() {
    echo "CloverQuery Health Monitor Status"
    echo "=================================="
    echo "Project Directory: $PROJECT_DIR"
    echo "Log File: $LOG_FILE"
    echo "Lock File: $LOCK_FILE"
    echo ""
    
    if [[ -f "$LOCK_FILE" ]]; then
        local pid
        pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            success "Health monitor is running (PID: $pid)"
        else
            warning "Stale lock file found"
        fi
    else
        info "Health monitor is not running"
    fi
    
    echo ""
    
    # Show recent health log entries
    if [[ -f "$LOG_FILE" ]]; then
        info "Recent health check entries:"
        tail -10 "$LOG_FILE"
    fi
}

# Show usage
show_usage() {
    echo "CloverQuery Health Monitor"
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  check               Run single health check"
    echo "  monitor             Start continuous monitoring (daemon mode)"
    echo "  status              Show monitoring status"
    echo "  stop                Stop health monitor"
    echo "  cleanup             Clean up old logs"
    echo ""
    echo "Environment Variables:"
    echo "  ALERT_EMAIL         Email for alerts (default: info@umatek.com)"
    echo ""
    echo "Examples:"
    echo "  $0 check            # Run single health check"
    echo "  $0 monitor          # Start continuous monitoring"
    echo "  $0 status           # Show current status"
}

# Continuous monitoring mode
continuous_monitor() {
    info "Starting continuous health monitoring..."
    create_lock
    
    while true; do
        perform_health_check
        cleanup_logs
        
        # Sleep for 5 minutes between checks
        sleep 300
    done
}

# Stop monitoring
stop_monitor() {
    if [[ -f "$LOCK_FILE" ]]; then
        local pid
        pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            info "Stopping health monitor (PID: $pid)..."
            kill "$pid"
            rm -f "$LOCK_FILE"
            success "Health monitor stopped"
        else
            warning "No running health monitor found"
            rm -f "$LOCK_FILE"
        fi
    else
        info "Health monitor is not running"
    fi
}

# Main script logic
case "${1:-}" in
    check)
        perform_health_check
        ;;
    monitor)
        continuous_monitor
        ;;
    status)
        show_status
        ;;
    stop)
        stop_monitor
        ;;
    cleanup)
        cleanup_logs
        success "Log cleanup completed"
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