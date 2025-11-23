#!/bin/bash
#
# End-to-end automation script for RustyClint with HTTPS support.
#
# Usage:
#   ./run-e2e.sh start       - Start the e2e environment with HTTPS
#   ./run-e2e.sh start -b    - Rebuild and start
#   ./run-e2e.sh stop        - Stop the environment
#   ./run-e2e.sh logs [svc]  - Show logs (optionally for specific service)
#   ./run-e2e.sh status      - Show service status
#   ./run-e2e.sh clean       - Stop and clean up everything
#   ./run-e2e.sh certs       - Generate certificates only

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/certs"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.e2e.yml"
PROJECT_NAME="rustyclint-e2e"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Generate self-signed certificates
generate_certs() {
    info "Generating self-signed SSL certificates..."

    mkdir -p "$CERTS_DIR"

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERTS_DIR/server.key" \
        -out "$CERTS_DIR/server.crt" \
        -subj "/C=US/ST=State/L=City/O=RustyClint/OU=Dev/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

    success "Certificates generated in $CERTS_DIR"
    info "  - Private Key: $CERTS_DIR/server.key"
    info "  - Certificate: $CERTS_DIR/server.crt"
}

# Check if certificates exist
check_certs() {
    [ -f "$CERTS_DIR/server.key" ] && [ -f "$CERTS_DIR/server.crt" ]
}

# Start the e2e environment
start_e2e() {
    local build_flag=""
    if [ "$1" = "-b" ] || [ "$1" = "--build" ]; then
        build_flag="--build"
    fi

    info "Starting RustyClint E2E environment with HTTPS..."

    # Ensure certificates exist
    if ! check_certs; then
        generate_certs
    else
        info "Using existing certificates in $CERTS_DIR"
    fi

    # Start services
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d $build_flag

    success "E2E environment started successfully!"
    echo ""
    info "Access the application:"
    info "  - HTTPS: https://localhost"
    info "  - API:   https://localhost/api/v1"
    info "  - Health: https://localhost/health"
    echo ""
    warn "Note: You may need to accept the self-signed certificate in your browser."
    echo ""
    info "Useful commands:"
    info "  ./run-e2e.sh logs          - View all logs"
    info "  ./run-e2e.sh logs api      - View API logs"
    info "  ./run-e2e.sh status        - Check service status"
    info "  ./run-e2e.sh stop          - Stop the environment"
    info "  ./run-e2e.sh clean         - Clean up everything"
}

# Stop the e2e environment
stop_e2e() {
    info "Stopping RustyClint E2E environment..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
    success "E2E environment stopped."
}

# Show logs
show_logs() {
    local service="$1"
    if [ -n "$service" ]; then
        docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs -f "$service"
    else
        docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs -f
    fi
}

# Clean up everything
clean_e2e() {
    info "Cleaning up RustyClint E2E environment..."

    # Stop and remove containers, networks, volumes
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down -v --remove-orphans

    # Remove certificates
    if [ -d "$CERTS_DIR" ]; then
        info "Removing certificates..."
        rm -rf "$CERTS_DIR"
    fi

    success "Cleanup complete."
}

# Show status
show_status() {
    info "RustyClint E2E Status:"
    echo ""
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
    echo ""
    info "Certificate Status:"
    if check_certs; then
        success "  Certificates exist in $CERTS_DIR"
    else
        warn "  No certificates found"
    fi
}

# Main
case "$1" in
    start)
        start_e2e "$2"
        ;;
    stop)
        stop_e2e
        ;;
    restart)
        stop_e2e
        start_e2e "$2"
        ;;
    logs)
        show_logs "$2"
        ;;
    clean)
        clean_e2e
        ;;
    status)
        show_status
        ;;
    certs)
        generate_certs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|clean|status|certs} [options]"
        echo ""
        echo "Commands:"
        echo "  start [-b]    Start the e2e environment (-b to rebuild)"
        echo "  stop          Stop the environment"
        echo "  restart [-b]  Restart the environment"
        echo "  logs [svc]    Show logs (optionally for specific service)"
        echo "  status        Show service status"
        echo "  clean         Stop and clean up everything"
        echo "  certs         Generate certificates only"
        exit 1
        ;;
esac
