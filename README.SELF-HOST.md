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
- Port 80 accessible from internet
- SSH access configured

### 3. Domain Configuration

Configure DNS in Cloudflare:
- A record: `excalidraw` → `your-server-ip`
- Enable proxy (orange cloud) for SSL termination

## Deployment Options

### Option 1: Using Pre-built Images (Recommended)

Uses images from GitHub Container Registry:

```bash
# On your server
cd ~/excalidraw-hosted
docker-compose -f docker-compose.ghcr.yml up -d
```

### Option 2: Build Locally

Build images on your server:

```bash
# On your server
cd ~/excalidraw-hosted
docker-compose -f docker-compose.prod.yml up -d --build
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
├── docker-compose.ghcr.yml    # GHCR-based deployment
├── docker-compose.prod.yml    # Local build deployment
├── nginx.conf                 # Nginx reverse proxy config
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
- Application: `http://localhost/health`
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
- Only port 80 exposed (Cloudflare handles HTTPS)
- Nginx rate limiting configured
- Security headers implemented
- Real IP detection for Cloudflare

## Troubleshooting

### Common Issues

1. **Image pull fails**: Ensure GITHUB_TOKEN has package read permissions
2. **SSH connection fails**: Check SSH key configuration and server firewall
3. **Domain not resolving**: Verify Cloudflare DNS settings
4. **Container won't start**: Check logs with `docker-compose logs`

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