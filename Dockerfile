# 🐳 Git Copilot Docker Image
# Multi-stage build for optimal production image size

# Stage 1: Builder
FROM node:20-alpine AS builder

# Install system dependencies for native modules (better-sqlite3, keytar)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libsecret-dev \
    git \
    bash \
    curl

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package.json package-lock.json* ./

# Install dependencies (use npm as default, bun only if explicitly needed)
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript (skip if there's nothing to build)
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

# Stage 2: Production
FROM node:20-alpine AS production

# Install runtime dependencies for native modules
RUN apk add --no-cache \
    libsecret \
    git \
    bash \
    curl

# Create non-root user for security
RUN addgroup -g 1001 -s git-copilot && \
    adduser -u 1001 -S git-copilot -G git-copilot

# Set working directory
WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder --chown=git-copilot:git-copilot /app/dist ./dist
COPY --from=builder --chown=git-copilot:git-copilot /app/node_modules ./node_modules
COPY --from=builder --chown=git-copilot:git-copilot /app/package.json ./

# Switch to non-root user
USER git-copilot

# Create config and data directories
RUN mkdir -p /home/git-copilot/.git-copilot

# Set environment variables
ENV NODE_ENV=production
ENV HOME=/home/git-copilot
ENV GIT_COPILOT_CONFIG=/home/git-copilot/.git-copilot/config.yaml

# Expose binary
RUN ln -s /app/dist/cli/index.js /usr/local/bin/git-copilot

# Default command
CMD ["git-copilot", "--help"]
