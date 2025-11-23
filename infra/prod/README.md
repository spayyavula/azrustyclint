# RustyClint Production Deployment

Production deployment configuration with HTTPS using Let's Encrypt certificates.

## Prerequisites

- **Server**: Linux server with public IP
- **Domain**: DNS A record pointing to your server
- **Ports**: 80 and 443 open in firewall
- **Docker**: Docker and Docker Compose installed
- **Email**: Valid email for Let's Encrypt notifications

## Files

| File | Description |
|------|-------------|
| `nginx.conf` | NGINX reverse proxy with TLS, rate limiting, security headers |
| `docker-compose.prod.yml` | Production stack with resource limits and health checks |
| `deploy.sh` | Deployment automation script |
| `.env.example` | Environment variable template |

## Quick Start

### 1. Configure Environment

```bash
cd infra/prod
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Required settings
DOMAIN=rustyclint.yourdomain.com
DB_PASSWORD=your-secure-db-password
REDIS_PASSWORD=your-secure-redis-password
JWT_SECRET=your-64-char-jwt-secret
CERTBOT_EMAIL=admin@yourdomain.com
```

### 2. Generate Secure Secrets

```bash
# JWT Secret (use this output for JWT_SECRET)
openssl rand -base64 48

# Database/Redis passwords
openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
```

### 3. Initialize SSL Certificates

This step obtains Let's Encrypt certificates. Your domain must be pointing to the server.

```bash
chmod +x deploy.sh
./deploy.sh init
```

### 4. Start Production Environment

```bash
./deploy.sh start
```

### 5. Verify Deployment

```bash
# Check service status
./deploy.sh status

# View logs
./deploy.sh logs

# Test HTTPS
curl -I https://yourdomain.com/health
```

## Management Commands

| Command | Description |
|---------|-------------|
| `./deploy.sh init` | First-time setup, obtain SSL certificates |
| `./deploy.sh start` | Start all services |
| `./deploy.sh start -b` | Rebuild images and start |
| `./deploy.sh stop` | Stop all services |
| `./deploy.sh restart` | Restart all services |
| `./deploy.sh logs` | View all logs (follow mode) |
| `./deploy.sh logs api` | View API service logs |
| `./deploy.sh status` | Show service status and certificate expiry |
| `./deploy.sh renew` | Force certificate renewal |
| `./deploy.sh backup` | Backup PostgreSQL database |
| `./deploy.sh update` | Pull latest code and redeploy |

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────┐
│  NGINX (ports 80, 443)              │
│  - TLS termination                  │
│  - Rate limiting                    │
│  - Security headers                 │
└──────────┬──────────────────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────┐
│   API   │ │ Frontend│
│ (Rust)  │ │ (React) │
└────┬────┘ └─────────┘
     │
┌────┴────────────┐
▼                 ▼
┌──────────┐ ┌─────────┐
│ PostgreSQL│ │  Redis  │
└──────────┘ └─────────┘
```

## Security Features

### TLS Configuration
- TLS 1.2 and 1.3 only
- Modern cipher suites (Mozilla recommended)
- OCSP stapling enabled
- Automatic certificate renewal

### Rate Limiting
- API endpoints: 10 requests/second (burst 20)
- Auth endpoints: 5 requests/minute (burst 3)
- Connection limit: 20 per IP

### Security Headers
- `Strict-Transport-Security` (HSTS with preload)
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`
- `Referrer-Policy`

### Network Isolation
- Backend network: postgres, redis, api
- Frontend network: api, web, nginx
- Database not exposed externally

### Resource Limits
| Service | CPU | Memory |
|---------|-----|--------|
| PostgreSQL | 2 cores | 2GB |
| Redis | 1 core | 1GB |
| API | 4 cores | 4GB |
| Frontend | 0.5 cores | 256MB |
| NGINX | 1 core | 512MB |

## Certificate Management

### Automatic Renewal
Certbot runs in a container and checks for renewal every 12 hours. Certificates are renewed when they have less than 30 days until expiry.

### Manual Renewal
```bash
./deploy.sh renew
```

### Check Certificate Status
```bash
./deploy.sh status
# Shows certificate expiry date
```

## Database Backups

### Create Backup
```bash
./deploy.sh backup
```

Backups are stored in `infra/prod/backups/` with timestamps. Only the last 7 backups are retained.

### Restore Backup
```bash
# Stop API to prevent writes
docker compose -f docker-compose.prod.yml -p rustyclint-prod stop api

# Restore
gunzip -c backups/rustyclint_20240101_120000.sql.gz | \
  docker compose -f docker-compose.prod.yml -p rustyclint-prod exec -T postgres \
  psql -U rustyclint rustyclint

# Start API
docker compose -f docker-compose.prod.yml -p rustyclint-prod start api
```

## Updating

### Standard Update
```bash
./deploy.sh update
```

This pulls the latest code, rebuilds images, and restarts services.

### Manual Update with Zero Downtime
```bash
# Pull latest code
git pull

# Rebuild specific service
docker compose -f docker-compose.prod.yml -p rustyclint-prod build api

# Rolling restart
docker compose -f docker-compose.prod.yml -p rustyclint-prod up -d --no-deps api
```

## Monitoring

### View Logs
```bash
# All services
./deploy.sh logs

# Specific service
./deploy.sh logs api
./deploy.sh logs nginx
./deploy.sh logs postgres
```

### Health Checks
```bash
# API health
curl https://yourdomain.com/health

# Service status
./deploy.sh status
```

### Container Resources
```bash
docker stats
```

## Troubleshooting

### Certificate Issues

**Problem**: Certificate initialization fails
```bash
# Check DNS resolution
dig +short yourdomain.com

# Ensure port 80 is accessible
curl -I http://yourdomain.com/.well-known/acme-challenge/test
```

**Problem**: Certificate renewal fails
```bash
# Check certbot logs
docker compose -f docker-compose.prod.yml -p rustyclint-prod logs certbot

# Manual renewal with verbose output
docker compose -f docker-compose.prod.yml -p rustyclint-prod run --rm certbot \
  certbot renew --dry-run
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
./deploy.sh logs postgres

# Test connection
docker compose -f docker-compose.prod.yml -p rustyclint-prod exec postgres \
  psql -U rustyclint -d rustyclint -c "SELECT 1"
```

### API Not Starting

```bash
# Check API logs
./deploy.sh logs api

# Verify environment variables
docker compose -f docker-compose.prod.yml -p rustyclint-prod exec api env | grep RUSTYCLINT
```

### NGINX 502 Bad Gateway

```bash
# Check if API is healthy
docker compose -f docker-compose.prod.yml -p rustyclint-prod ps api

# Check NGINX logs
./deploy.sh logs nginx

# Verify upstream connectivity
docker compose -f docker-compose.prod.yml -p rustyclint-prod exec nginx \
  wget -qO- http://api:3000/health
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOMAIN` | Yes | - | Your domain name |
| `DB_USER` | Yes | - | PostgreSQL username |
| `DB_PASSWORD` | Yes | - | PostgreSQL password |
| `DB_NAME` | Yes | - | PostgreSQL database name |
| `REDIS_PASSWORD` | Yes | - | Redis password |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `CERTBOT_EMAIL` | Yes | - | Email for Let's Encrypt |
| `JWT_EXPIRY_HOURS` | No | 24 | JWT token expiration |
| `SANDBOX_TIMEOUT_SECS` | No | 300 | Code execution timeout |
| `MAX_CONTAINERS_PER_USER` | No | 3 | Max sandbox containers per user |
| `RUST_LOG` | No | info | Log level |
| `CERTBOT_EXTRA_DOMAINS` | No | - | Additional domains for certificate |

## Comparison: E2E vs Production

| Feature | E2E (`infra/e2e`) | Production (`infra/prod`) |
|---------|-------------------|---------------------------|
| Certificates | Self-signed | Let's Encrypt |
| Secrets | Hardcoded | Environment variables |
| Rate Limiting | None | Enabled |
| Resource Limits | None | Configured |
| Network Isolation | Single network | Backend/Frontend split |
| Database Backups | None | Automated |
| Certificate Renewal | Manual | Automatic |
| Use Case | Local testing | Production deployment |
