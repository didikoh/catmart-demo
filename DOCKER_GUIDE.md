# Docker Guide for CatMart Project

A comprehensive guide to understanding Docker concepts and implementation in the CatMart e-commerce demo.

## Table of Contents

1. [Docker Fundamentals](#docker-fundamentals)
2. [Docker in CatMart Project](#docker-in-catmart-project)
3. [Dockerfile Analysis](#dockerfile-analysis)
4. [Docker Compose Deep Dive](#docker-compose-deep-dive)
5. [Container Networking](#container-networking)
6. [Volume Management](#volume-management)
7. [Build Process](#build-process)
8. [Development Workflow](#development-workflow)
9. [Production Considerations](#production-considerations)
10. [Troubleshooting](#troubleshooting)

## Docker Fundamentals

### What is Docker?

Docker is a containerization platform that packages applications and their dependencies into lightweight, portable containers. Think of containers as standardized shipping containers for software.

### Key Concepts

#### 1. **Images**
- Read-only templates used to create containers
- Built in layers for efficiency and caching
- Defined by Dockerfile instructions
- Immutable once created

#### 2. **Containers**
- Running instances of Docker images
- Isolated processes with their own filesystem, networking, and process space
- Ephemeral by default - data is lost when container stops

#### 3. **Dockerfile**
- Text file with instructions to build Docker images
- Defines the environment, dependencies, and commands
- Each instruction creates a new layer in the image

#### 4. **Docker Compose**
- Tool for defining multi-container applications
- Uses YAML files to configure services
- Manages container orchestration, networking, and volumes

### Docker vs Virtual Machines

```
┌─────────────────────────┐    ┌─────────────────────────┐
│       Docker            │    │   Virtual Machines      │
├─────────────────────────┤    ├─────────────────────────┤
│ App A │ App B │ App C   │    │ App A │ App B │ App C   │
├───────┼───────┼─────────┤    ├───────┼───────┼─────────┤
│ Bins/Libs │ Bins/Libs   │    │ Bins  │ Bins  │ Bins    │
├───────────────┼─────────┤    │ /Libs │ /Libs │ /Libs   │
│ Docker Engine │         │    ├───────┼───────┼─────────┤
├───────────────┼─────────┤    │Guest OS│Guest OS│Guest OS│
│    Host OS    │         │    ├───────┼───────┼─────────┤
├───────────────┼─────────┤    │    Hypervisor         │
│  Infrastructure         │    ├───────────────┼─────────┤
└─────────────────────────┘    │    Host OS    │         │
                               ├───────────────┼─────────┤
                               │  Infrastructure         │
                               └─────────────────────────┘
```

**Benefits of Docker:**
- Lighter resource usage
- Faster startup times
- Better portability
- Consistent environments

## Docker in CatMart Project

### Architecture Overview

The CatMart project uses a microservices architecture with four main services:

```
┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │    Go API       │
│   (React/Vite)  │◄──►│   (Gin/JWT)     │
│   Port: 5173    │    │   Port: 8080    │
└─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         │              │   PostgreSQL    │
         │              │   Database      │
         │              │   Port: 5432    │
         │              └─────────────────┘
         │                       │
┌─────────────────┐              │
│   Python ML     │◄─────────────┘
│   (FastAPI)     │
│   Port: 8090    │
└─────────────────┘
```

### Service Communication

1. **Frontend → Go API**: HTTP requests for authentication, products, orders
2. **Frontend → Python ML**: HTTP requests for recommendations and reports
3. **Go API → PostgreSQL**: Database queries for persistent data
4. **Python ML → PostgreSQL**: Analytics queries for sales reports

## Dockerfile Analysis

### React Frontend Dockerfile

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

**Key Concepts:**
- **Multi-stage build**: Reduces final image size by ~90%
- **Layer caching**: `package*.json` copied first so dependencies don't rebuild on code changes
- **Alpine Linux**: Minimal base image for security and size
- **Production server**: Nginx serves static files efficiently

### Go API Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files first
COPY go.mod go.sum ./

# Download dependencies (cached layer)
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server

# Final stage
FROM alpine:latest

# Security: create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder stage
COPY --from=builder /app/main .

# Change ownership to non-root user
RUN chown appuser:appgroup main
USER appuser

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
```

**Key Concepts:**
- **Static binary**: `CGO_ENABLED=0` creates a fully static binary
- **Security**: Non-root user reduces attack surface
- **Minimal runtime**: Alpine base image with only necessary packages
- **SSL support**: ca-certificates for external HTTPS calls

### Python ML Dockerfile

```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Key Concepts:**
- **Python slim**: Smaller than full Python image but includes necessary libraries
- **Build dependencies**: gcc needed for some Python packages
- **Environment variables**: Configure Python behavior
- **Security**: Non-root user for production safety

## Docker Compose Deep Dive

### Service Definitions

```yaml
version: '3.8'

services:
  # Database service
  db:
    image: postgres:15-alpine
    container_name: catmart-db
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Go API service
  go-api:
    build:
      context: ../backend/go-api
      dockerfile: Dockerfile
    container_name: catmart-go-api
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ${POSTGRES_DB}
      DB_USER: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ../backend/go-api:/app
    networks:
      - catmart-network

  # Python ML service
  py-ml:
    build:
      context: ../backend/py-ml
      dockerfile: Dockerfile
    container_name: catmart-py-ml
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    ports:
      - "8090:8000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - catmart-network

  # Web frontend
  web:
    build:
      context: ../frontend/catmart-web
      dockerfile: Dockerfile
    container_name: catmart-web
    ports:
      - "5173:80"
    depends_on:
      - go-api
      - py-ml
    networks:
      - catmart-network

volumes:
  postgres_data:

networks:
  catmart-network:
    driver: bridge
```

### Key Docker Compose Concepts

#### 1. **Service Dependencies**
```yaml
depends_on:
  db:
    condition: service_healthy
```
- Ensures database is ready before starting API services
- Uses health checks to verify service availability

#### 2. **Environment Variables**
```yaml
environment:
  DB_HOST: db  # Uses service name as hostname
  DB_PORT: 5432
```
- Configuration through environment variables
- Service discovery through container names

#### 3. **Volume Management**
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data  # Named volume for persistence
  - ./migrations:/docker-entrypoint-initdb.d  # Bind mount for initialization
```
- **Named volumes**: Persistent data storage
- **Bind mounts**: Development file synchronization

#### 4. **Health Checks**
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
  interval: 30s
  timeout: 10s
  retries: 5
```
- Verifies service readiness
- Enables conditional service startup

## Container Networking

### Default Bridge Network

Docker Compose creates an isolated network for your services:

```
┌─────────────────────────────────────────────────────────┐
│                catmart-network                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │    web   │  │  go-api  │  │   py-ml  │  │   db   │ │
│  │ 172.x.x.2│  │172.x.x.3 │  │172.x.x.4 │ │172.x.x.5│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Host Network    │
                    │   Port Mapping    │
                    │ 5173 → web:80     │
                    │ 8080 → go-api:8080│
                    │ 8090 → py-ml:8000 │
                    │ 5432 → db:5432    │
                    └───────────────────┘
```

### Service Discovery

Services communicate using container names as hostnames:

```go
// In Go API - connecting to database
dbHost := os.Getenv("DB_HOST") // "db"
dsn := fmt.Sprintf("host=%s port=5432 user=%s password=%s dbname=%s",
    dbHost, dbUser, dbPassword, dbName)
```

```typescript
// In Frontend - API calls
const API_BASE = 'http://localhost:8080/api'  // External access
const ML_BASE = 'http://localhost:8090/ml'    // External access
```

### Port Mapping

```yaml
ports:
  - "HOST_PORT:CONTAINER_PORT"
```

- **Host Port**: Accessible from your machine
- **Container Port**: Internal service port
- Only mapped ports are accessible externally

## Volume Management

### Types of Volumes

#### 1. **Named Volumes** (Persistent Data)
```yaml
volumes:
  postgres_data:  # Named volume declaration

services:
  db:
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Usage
```

**Characteristics:**
- Managed by Docker
- Persistent across container restarts
- Shared between containers
- Located in Docker's storage area

#### 2. **Bind Mounts** (Development)
```yaml
services:
  go-api:
    volumes:
      - ../backend/go-api:/app  # Host:Container
```

**Characteristics:**
- Direct mapping to host filesystem
- Real-time file synchronization
- Great for development
- Host path dependent

#### 3. **Anonymous Volumes** (Temporary)
```yaml
services:
  app:
    volumes:
      - /app/temp  # No host mapping
```

**Characteristics:**
- Temporary storage
- Deleted when container is removed
- Useful for cache directories

### Volume Lifecycle

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect catmart-demo_postgres_data

# Remove volumes (careful!)
docker volume rm catmart-demo_postgres_data

# Remove all unused volumes
docker volume prune
```

## Build Process

### Build Context

The build context is the set of files sent to Docker daemon:

```
build:
  context: ../backend/go-api  # Build context directory
  dockerfile: Dockerfile      # Dockerfile location
```

### Build Stages

1. **Preparation**: Set working directory, copy dependency files
2. **Dependencies**: Install packages and libraries
3. **Compilation**: Build the application
4. **Runtime**: Set up final container environment

### Build Optimization

#### Layer Caching
```dockerfile
# Bad: Changes in code rebuild everything
COPY . .
RUN npm install

# Good: Dependencies cached separately
COPY package*.json ./
RUN npm install
COPY . .
```

#### Multi-stage Builds
```dockerfile
# Build stage
FROM node:18 AS builder
# ... build process

# Runtime stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

Benefits:
- Smaller final images
- Security (no build tools in production)
- Faster deployments

### Build Commands

```bash
# Build single service
docker compose build go-api

# Build all services
docker compose build

# Force rebuild (ignore cache)
docker compose build --no-cache

# Build with specific target stage
docker build --target builder .
```

## Development Workflow

### Local Development Setup

1. **Initial Setup**
```bash
cd catmart-demo/infra
cp .env.example .env
# Edit .env with your settings
```

2. **Build and Start**
```bash
docker compose up --build
```

3. **Development Mode**
```bash
# Start specific services
docker compose up db go-api

# Run in detached mode
docker compose up -d

# View logs
docker compose logs -f go-api
```

### Hot Reloading

#### Frontend (React)
```dockerfile
# Development override
volumes:
  - ../frontend/catmart-web:/app
  - /app/node_modules  # Prevent override
```

#### Backend (Go)
```dockerfile
# Use air for hot reloading
RUN go install github.com/cosmtrek/air@latest
CMD ["air", "-c", ".air.toml"]
```

### Docker Compose Override

Create `docker-compose.override.yml` for development:

```yaml
version: '3.8'
services:
  go-api:
    volumes:
      - ../backend/go-api:/app
    environment:
      - GIN_MODE=debug
    command: air -c .air.toml

  web:
    volumes:
      - ../frontend/catmart-web:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8080/api
```

### Database Management

```bash
# Execute SQL in database
docker compose exec db psql -U catmart -d catmart

# Run migrations
docker compose exec go-api ./migrate

# Backup database
docker compose exec db pg_dump -U catmart catmart > backup.sql

# Restore database
docker compose exec -T db psql -U catmart catmart < backup.sql
```

## Production Considerations

### Security Best Practices

#### 1. **Non-root Users**
```dockerfile
RUN adduser --system --group appuser
USER appuser
```

#### 2. **Minimal Base Images**
```dockerfile
FROM alpine:latest  # Instead of ubuntu
FROM node:18-alpine # Instead of node:18
```

#### 3. **Secret Management**
```yaml
# Don't do this in production
environment:
  DB_PASSWORD: mypassword

# Use Docker secrets instead
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

#### 4. **Read-only Filesystems**
```yaml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
```

### Performance Optimization

#### 1. **Resource Limits**
```yaml
services:
  go-api:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

#### 2. **Health Checks**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

#### 3. **Logging Configuration**
```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Production Deployment

#### 1. **Environment-specific Configs**
```bash
# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up

# Staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up
```

#### 2. **Image Registry**
```yaml
services:
  go-api:
    image: registry.example.com/catmart/go-api:v1.0.0
    # Instead of building locally
```

#### 3. **Orchestration Platform**
- Docker Swarm for simple deployments
- Kubernetes for complex scenarios
- AWS ECS, Google Cloud Run, etc.

## Troubleshooting

### Common Issues and Solutions

#### 1. **Container Won't Start**
```bash
# Check logs
docker compose logs service-name

# Check container status
docker compose ps

# Inspect container configuration
docker inspect container-name
```

#### 2. **Database Connection Issues**
```bash
# Test database connectivity
docker compose exec go-api ping db

# Check database is ready
docker compose exec db pg_isready -U catmart

# View database logs
docker compose logs db
```

#### 3. **Port Conflicts**
```bash
# Check what's using the port
netstat -tulpn | grep :8080

# Use different host port
ports:
  - "8081:8080"  # Instead of 8080:8080
```

#### 4. **Build Failures**
```bash
# Clear build cache
docker builder prune

# Remove all images and rebuild
docker compose down --rmi all
docker compose build --no-cache
```

#### 5. **Volume Issues**
```bash
# Check volume contents
docker compose exec service-name ls -la /path/to/volume

# Reset volumes (WARNING: deletes data)
docker compose down -v
```

### Debugging Commands

```bash
# Enter running container
docker compose exec service-name /bin/sh

# Run one-off command
docker compose run --rm service-name /bin/sh

# Copy files from container
docker compose cp service-name:/app/file.txt ./

# View container processes
docker compose top service-name

# Monitor resource usage
docker stats
```

### Performance Monitoring

```bash
# Container resource usage
docker stats

# System resource usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Best Practices Summary

### Development
- Use bind mounts for code synchronization
- Implement hot reloading for faster development
- Use override files for environment-specific configs
- Keep images small with multi-stage builds

### Security
- Run containers as non-root users
- Use minimal base images
- Implement proper secret management
- Keep images updated

### Performance
- Set resource limits
- Implement health checks
- Use proper logging configuration
- Optimize layer caching

### Operations
- Use meaningful container names
- Implement proper monitoring
- Plan for data persistence
- Document deployment procedures

## Conclusion

Docker transforms how we develop, deploy, and run applications by providing:

1. **Consistency**: Same environment everywhere
2. **Isolation**: Services don't interfere with each other  
3. **Scalability**: Easy to replicate and scale services
4. **Portability**: Run anywhere Docker runs
5. **Efficiency**: Better resource utilization than VMs

The CatMart project demonstrates a real-world Docker implementation with multiple services, proper networking, persistent storage, and development-friendly configurations. Understanding these concepts will help you build and deploy containerized applications effectively.

---

*This guide covers Docker fundamentals through practical implementation in the CatMart project. For more advanced topics like Docker Swarm, Kubernetes integration, or container security hardening, refer to the official Docker documentation.*
