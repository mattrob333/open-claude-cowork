# Open Claude Cowork - Production Dockerfile
# Multi-stage build: Frontend (Vite) + Backend (Node.js Express)

# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

# Build args for Vite (embedded at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

WORKDIR /app/renderer

# Copy renderer package files
COPY renderer/package*.json ./

# Install dependencies
RUN npm ci

# Copy renderer source
COPY renderer/ ./

# Set environment variables for Vite build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build the frontend
RUN npm run build

# ============================================
# Stage 2: Production Server
# ============================================
FROM node:20-alpine AS production

# Install dependencies for Playwright (browser automation)
# Note: Full Playwright install is large; skip if browser features not needed
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/

# Install production dependencies only
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/renderer/dist /app/renderer/dist

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Create directories for runtime data
RUN mkdir -p /app/data /app/logs && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Start the server
CMD ["node", "server.js"]
