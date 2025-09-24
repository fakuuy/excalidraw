# Excalidraw Self-Hosting Setup

Self-hosted Excalidraw instance for `excalidraw.faku.pro` with Docker and GitHub Container Registry support.

## Features

- 🐳 Docker containerization with multi-architecture support (amd64/arm64)
- 🏗️ Automated builds with GitHub Actions
- 📦 GitHub Container Registry (GHCR) for image storage
- 🚀 SSH-based deployment workflow
- ☁️ Cloudflare integration for SSL termination
- 🔒 Private repository support

## Quick Start

### 1. Repository Setup

1. **Make repository private** (if desired)
2. **Configure GitHub Secrets** in repository settings:
   ```
   SSH_PRIVATE_KEY - Your SSH private key for server access
   SSH_USER        - Username on your VM (e.g., ubuntu)
   SERVER_HOST     - Your server IP address or hostname
   ```

### 2. Server Requirements

- Linux VPS/VM with Docker and Docker Compose
- Global Nginx already installed and running
- SSH access configured
- Docker containers will run on internal port 8080

### 3. Domain Configuration

Configure DNS in Cloudflare:
- A record: `excalidraw` → `your-server-ip`
- Enable proxy (orange cloud) for SSL termination

### 4. Global Nginx Configuration

Add this configuration to your global nginx for `excalidraw.faku.pro`:

```nginx
# In your existing nginx sites configuration
upstream excalidraw_docker {
    server 127.0.0.1:8080;  # Docker container internal nginx
    keepalive 32;
}

server {
    listen 80;
    server_name excalidraw.faku.pro;

    # Trust Cloudflare IPs for real IP detection
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    real_ip_header CF-Connecting-IP;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://excalidraw_docker;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://excalidraw_docker;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
```

After adding this configuration, reload nginx:
```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

## Deployment Options

### Option 1: Using Pre-built Images (Recommended)

Uses images from GitHub Container Registry:

```bash
# On your server
cd ~/excalidraw-hosted
docker-compose -f docker-compose.ghcr.yml up -d

# Check that containers are running on port 8080
docker-compose -f docker-compose.ghcr.yml ps
curl http://localhost:8080/health  # Should return "healthy"
```

### Option 2: Build Locally

Build images on your server:

```bash
# On your server
cd ~/excalidraw-hosted
docker-compose -f docker-compose.prod.yml up -d --build

# Check that containers are running on port 8080
docker-compose -f docker-compose.prod.yml ps
curl http://localhost:8080/health  # Should return "healthy"
```

## GitHub Actions Workflows

### Build Workflow (`.github/workflows/build.yml`)
- Triggers on push to main/master
- Builds multi-architecture Docker images
- Pushes to GitHub Container Registry
- Caches build layers for faster builds

### Deploy Workflow (`.github/workflows/deploy.yml`)
- Triggers on push to main/master or manually
- SSH into your server
- Pulls latest images from GHCR
- Restarts containers with zero downtime

## File Structure

```
├── .github/workflows/
│   ├── build.yml              # Build and push images to GHCR
│   └── deploy.yml             # Deploy to server via SSH
├── docker-compose.ghcr.yml    # GHCR-based deployment (port 8080)
├── docker-compose.prod.yml    # Local build deployment (port 8080)
├── nginx-internal.conf        # Internal Docker nginx config
├── Dockerfile                 # Excalidraw container build
├── DEPLOYMENT.md              # Detailed deployment guide
└── README.SELF-HOST.md        # This file
```

## Container Images

Images are automatically built and pushed to:
- `ghcr.io/your-username/excalidraw-hosted:latest`
- `ghcr.io/your-username/excalidraw-hosted:master-<sha>`

### Image Features
- Based on Node.js 18 Alpine
- Multi-stage build for smaller size
- Nginx serving static files
- Health checks included
- Multi-architecture support (amd64/arm64)

## Environment Variables

### docker-compose.ghcr.yml
- `GITHUB_REPOSITORY`: Set automatically by GitHub Actions
- Can be overridden locally: `GITHUB_REPOSITORY=username/repo-name`

## Monitoring

### Health Checks
- Docker container: `http://localhost:8080/health`
- Via global nginx: `https://excalidraw.faku.pro/health`
- Container health: `docker-compose ps`

### Logs
```bash
# View all logs
docker-compose -f docker-compose.ghcr.yml logs -f

# View specific service logs
docker-compose -f docker-compose.ghcr.yml logs -f excalidraw-app
docker-compose -f docker-compose.ghcr.yml logs -f nginx-proxy
```

## Security

### Private Repository Benefits
- Source code not publicly visible
- Container images remain private
- Access control via GitHub permissions

### Network Security
- Docker containers run internally on port 8080
- Global nginx handles external traffic on port 80
- Cloudflare handles HTTPS termination
- Security headers implemented in both nginx layers
- Real IP detection for Cloudflare configured

## Troubleshooting

### Common Issues

1. **Image pull fails**: Ensure GITHUB_TOKEN has package read permissions
2. **SSH connection fails**: Check SSH key configuration and server firewall
3. **Domain not resolving**: Verify Cloudflare DNS settings and global nginx config
4. **Container won't start**: Check logs with `docker-compose logs`
5. **Port 8080 conflict**: Change port in docker-compose files and global nginx upstream

### Manual Deployment

If GitHub Actions fail, deploy manually:

```bash
# SSH into your server
ssh user@your-server

# Navigate to project directory
cd ~/excalidraw-hosted

# Pull latest changes
git pull origin main

# Pull latest images and restart
docker-compose -f docker-compose.ghcr.yml pull
docker-compose -f docker-compose.ghcr.yml up -d

# Check status
docker-compose -f docker-compose.ghcr.yml ps
```

## Development

### Local Development

```bash
# Clone repository
git clone https://github.com/your-username/excalidraw-hosted.git
cd excalidraw-hosted

# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f
```

### Making Changes

1. Make your changes
2. Commit and push to main/master
3. GitHub Actions will automatically build and deploy

## Support

For issues related to:
- **Excalidraw itself**: [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)
- **Self-hosting setup**: Check the logs and troubleshooting section above

## License

This self-hosting setup follows the same license as Excalidraw. See the original [Excalidraw repository](https://github.com/excalidraw/excalidraw) for license details.