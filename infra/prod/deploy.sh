#!/bin/bash
#
# Production deployment script for RustyClint with HTTPS (Let's Encrypt)
#
# Usage:
#   ./deploy.sh init          - First-time setup (get certificates)
#   ./deploy.sh start         - Start production environment
#   ./deploy.sh stop          - Stop the environment
#   ./deploy.sh restart       - Restart services
#   ./deploy.sh logs [svc]    - Show logs
#   ./deploy.sh status        - Show service status
#   ./deploy.sh renew         - Force certificate renewal
#   ./deploy.sh backup        - Backup database
#   ./deploy.sh update        - Pull latest and redeploy

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.prod.yml"
ENV_FILE="$SCRIPT_DIR/.env"
PROJECT_NAME="rustyclint-prod"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check prerequisites
check_prerequisites() {
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed."
    command -v docker compose >/dev/null 2>&1 || error "Docker Compose is required but not installed."

    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file not found: $ENV_FILE\nCopy .env.example to .env and configure it."
    fi
}

# Load environment
load_env() {
    set -a
    source "$ENV_FILE"
    set +a
}

# Validate environment
validate_env() {
    local required_vars=("DOMAIN" "DB_USER" "DB_PASSWORD" "DB_NAME" "REDIS_PASSWORD" "JWT_SECRET" "CERTBOT_EMAIL")
    local missing=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing+=("$var")
        fi
    done

    if [ ${#missing[@]} -ne 0 ]; then
        error "Missing required environment variables: ${missing[*]}"
    fi

    # Validate JWT secret length
    if [ ${#JWT_SECRET} -lt 32 ]; then
        error "JWT_SECRET must be at least 32 characters long"
    fi

    # Validate domain format
    if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+[a-zA-Z0-9]$ ]]; then
        error "Invalid domain format: $DOMAIN"
    fi
}

# Initialize Let's Encrypt certificates
init_certificates() {
    info "Initializing Let's Encrypt certificates for $DOMAIN..."

    # Create required directories
    mkdir -p "$SCRIPT_DIR/certbot/www"
    mkdir -p "$SCRIPT_DIR/certbot/conf"

    # Start nginx temporarily for ACME challenge
    info "Starting temporary nginx for certificate verification..."

    # Create temporary nginx config for initial cert
    cat > "$SCRIPT_DIR/nginx-init.conf" << 'EOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name _;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 200 'RustyClint initializing...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

    # Start temporary nginx
    docker run -d --name nginx-init \
        -p 80:80 \
        -v "$SCRIPT_DIR/nginx-init.conf:/etc/nginx/nginx.conf:ro" \
        -v "$SCRIPT_DIR/certbot/www:/var/www/certbot" \
        nginx:alpine

    # Request certificate
    info "Requesting certificate from Let's Encrypt..."

    docker run --rm \
        -v "$SCRIPT_DIR/certbot/conf:/etc/letsencrypt" \
        -v "$SCRIPT_DIR/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$CERTBOT_EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "$DOMAIN" \
        ${CERTBOT_EXTRA_DOMAINS:+-d $CERTBOT_EXTRA_DOMAINS}

    # Stop and remove temporary nginx
    docker stop nginx-init && docker rm nginx-init
    rm "$SCRIPT_DIR/nginx-init.conf"

    success "Certificate obtained successfully!"
    info "Certificate location: $SCRIPT_DIR/certbot/conf/live/$DOMAIN/"
}

# Start production environment
start_prod() {
    local build_flag=""
    if [ "$1" = "-b" ] || [ "$1" = "--build" ]; then
        build_flag="--build"
    fi

    info "Starting RustyClint production environment..."

    # Check if certificates exist
    if [ ! -d "$SCRIPT_DIR/certbot/conf/live/$DOMAIN" ]; then
        error "Certificates not found. Run './deploy.sh init' first."
    fi

    # Update nginx config with domain
    sed "s/\${DOMAIN}/$DOMAIN/g" "$SCRIPT_DIR/nginx.conf" > "$SCRIPT_DIR/nginx-rendered.conf"

    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d $build_flag

    success "Production environment started!"
    echo ""
    info "Access the application:"
    info "  - HTTPS: https://$DOMAIN"
    info "  - API:   https://$DOMAIN/api/v1"
    info "  - Health: https://$DOMAIN/health"
}

# Stop production environment
stop_prod() {
    info "Stopping RustyClint production environment..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
    success "Production environment stopped."
}

# Restart services
restart_prod() {
    info "Restarting RustyClint production environment..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" restart
    success "Services restarted."
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

# Show status
show_status() {
    info "RustyClint Production Status:"
    echo ""
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
    echo ""

    # Check certificate expiry
    if [ -f "$SCRIPT_DIR/certbot/conf/live/$DOMAIN/cert.pem" ]; then
        local expiry=$(openssl x509 -enddate -noout -in "$SCRIPT_DIR/certbot/conf/live/$DOMAIN/cert.pem" | cut -d= -f2)
        info "Certificate expires: $expiry"
    fi
}

# Force certificate renewal
renew_certs() {
    info "Forcing certificate renewal..."

    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" run --rm certbot \
        certbot renew --force-renewal

    # Reload nginx
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec nginx nginx -s reload

    success "Certificates renewed and nginx reloaded."
}

# Backup database
backup_db() {
    local backup_dir="$SCRIPT_DIR/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/rustyclint_${timestamp}.sql.gz"

    mkdir -p "$backup_dir"

    info "Backing up database to $backup_file..."

    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec -T postgres \
        pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$backup_file"

    success "Backup created: $backup_file"

    # Keep only last 7 backups
    ls -t "$backup_dir"/*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm

    info "Retained last 7 backups."
}

# Update and redeploy
update_deploy() {
    info "Updating and redeploying RustyClint..."

    # Pull latest code
    git -C "$SCRIPT_DIR/../.." pull

    # Rebuild and restart
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --build

    success "Update complete!"
}

# Main
check_prerequisites
load_env
validate_env

case "$1" in
    init)
        init_certificates
        ;;
    start)
        start_prod "$2"
        ;;
    stop)
        stop_prod
        ;;
    restart)
        restart_prod
        ;;
    logs)
        show_logs "$2"
        ;;
    status)
        show_status
        ;;
    renew)
        renew_certs
        ;;
    backup)
        backup_db
        ;;
    update)
        update_deploy
        ;;
    *)
        echo "RustyClint Production Deployment Script"
        echo ""
        echo "Usage: $0 {init|start|stop|restart|logs|status|renew|backup|update}"
        echo ""
        echo "Commands:"
        echo "  init          First-time setup (obtain Let's Encrypt certificates)"
        echo "  start [-b]    Start production environment (-b to rebuild)"
        echo "  stop          Stop the environment"
        echo "  restart       Restart all services"
        echo "  logs [svc]    Show logs (optionally for specific service)"
        echo "  status        Show service status and certificate info"
        echo "  renew         Force certificate renewal"
        echo "  backup        Backup PostgreSQL database"
        echo "  update        Pull latest code and redeploy"
        exit 1
        ;;
esac
