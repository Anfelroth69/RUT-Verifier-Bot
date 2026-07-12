# Use official Playwright image for Node.js
FROM mcr.microsoft.com/playwright:v1.61.0-noble

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PLAYWRIGHT_HEADLESS=true

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and all dependencies (including devDeps for build)
RUN corepack enable && pnpm install --frozen-lockfile

# Copy application code
COPY ./src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN pnpm build

# Remove dev dependencies for smaller image
RUN pnpm prune --prod

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
