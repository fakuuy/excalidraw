# Excalidraw Self-Hosting Deployment Guide

This guide will help you deploy Excalidraw to `excalidraw.faku.pro` using Docker and GitHub Actions.

## Prerequisites

- A VPS/VM with Docker and Docker Compose installed
- Domain `excalidraw.faku.pro` configured with Cloudflare
- GitHub repository with Actions enabled

## Server Setup

1. **Install Docker and Docker Compose on your VM:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Add user to docker group
   sudo usermod -aG docker $USER

   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose

   # Restart and test
   sudo systemctl restart docker
   docker --version
   docker-compose --version
   ```

2. **Create project directory:**
   ```bash
   mkdir -p ~/excalidraw-hosted
   cd ~/excalidraw-hosted
   ```

## GitHub Repository Setup

1. **Fork this repository or create a new one with these files**

2. **Configure GitHub Secrets:**
   Go to your repository → Settings → Secrets and variables → Actions

   Add these secrets:
   - `SSH_PRIVATE_KEY`: Your private SSH key to access the VM
   - `SSH_USER`: Username on your VM (e.g., `ubuntu`, `root`, etc.)
   - `SERVER_HOST`: Your VM's IP address or hostname

3. **Generate SSH Key (if you don't have one):**
   ```bash
   # On your local machine
   ssh-keygen -t ed25519 -C "github-actions@excalidraw"

   # Copy public key to your VM
   ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server-ip

   # Copy private key content for GitHub secret
   cat ~/.ssh/id_ed25519
   ```

## Cloudflare Configuration

1. **DNS Settings:**
   - Create an A record: `excalidraw` → `your-server-ip`
   - Enable proxy (orange cloud) for SSL termination

2. **SSL/TLS Settings:**
   - Set encryption mode to "Flexible" or "Full"
   - Enable "Always Use HTTPS"

## Deployment

### Automatic Deployment
- Push to `main` branch triggers automatic deployment
- Or manually trigger via GitHub Actions tab

### Manual Deployment
On your server:
```bash
cd ~/excalidraw-hosted

# Copy the configuration files to your server
# (nginx.conf, docker-compose.prod.yml)

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

## File Structure

```
excalidraw-hosted/
├── .github/workflows/deploy.yml    # GitHub Actions workflow
├── docker-compose.prod.yml         # Production Docker Compose
├── nginx.conf                      # Nginx configuration for Cloudflare
├── Dockerfile                      # Excalidraw Docker build
└── DEPLOYMENT.md                   # This file
```

## Monitoring and Maintenance

### Check Application Status
```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check container health
docker-compose -f docker-compose.prod.yml ps

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Update Excalidraw
Updates happen automatically via GitHub Actions when you push to main branch.

For manual updates:
```bash
cd ~/excalidraw-hosted
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

## Troubleshooting

### Common Issues

1. **Container won't start:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs excalidraw-app
   ```

2. **Nginx errors:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs nginx-proxy
   ```

3. **Port conflicts:**
   ```bash
   sudo netstat -tlnp | grep :80
   sudo fuser -k 80/tcp  # Kill process using port 80
   ```

4. **DNS not resolving:**
   - Check Cloudflare DNS settings
   - Verify A record points to correct IP
   - Wait for DNS propagation (up to 24 hours)

### Useful Commands

```bash
# View all containers
docker ps -a

# Remove old containers and images
docker system prune -a

# Check disk usage
docker system df

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Security Considerations

- The nginx configuration includes Cloudflare IP ranges for real IP detection
- Rate limiting is enabled (10 requests/second with burst of 20)
- Security headers are configured
- Regular security updates should be applied to the host OS

## Support

If you encounter issues:
1. Check container logs
2. Verify Cloudflare configuration
3. Ensure all GitHub secrets are correctly set
4. Test SSH connection manually