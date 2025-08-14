# Development dependencies stage
FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

# Production dependencies stage
FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

# Build stage
FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

# Final production image
FROM node:20-alpine

# Install system dependencies for Puppeteer and PDF generation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-dejavu \
    ttf-droid \
    ttf-liberation \
    && rm -rf /var/cache/apk/*

# Configure Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory and required subdirectories
WORKDIR /app
RUN mkdir -p /app/data /app/reports /app/scripts

# Copy package files and dependencies
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules

# Copy built application
COPY --from=build-env /app/build /app/build

# Copy scripts and other necessary files
COPY ./scripts /app/scripts
COPY ./app /app/app
COPY ./.env.example /app/.env.example

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S clover -u 1001 -G nodejs

# Set ownership of app directory
RUN chown -R clover:nodejs /app && \
    chmod +x /app/scripts/*.ts

# Switch to non-root user
USER clover

# Expose port for web interface
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Default command starts the web server
CMD ["npm", "run", "start"]