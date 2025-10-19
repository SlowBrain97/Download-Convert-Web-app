
# ---------- Build Stage ----------
FROM node:18-bookworm AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json tsconfig.json ./

# Install dependencies (no postinstall scripts yet)
RUN npm install --ignore-scripts

# Copy source
COPY . .

# Build TypeScript (src -> dist)
RUN npm run build


# ---------- Production Stage ----------
FROM node:18-bookworm-slim AS production

WORKDIR /app

# Update apt and install dependencies (Python 3.11 + ffmpeg + office)
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv \
    ffmpeg libreoffice libreoffice-writer libreoffice-calc \
    curl ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Remove EXTERNALLY-MANAGED marker (safe in Docker containers)
RUN rm -f /usr/lib/python*/EXTERNALLY-MANAGED

# Install latest yt-dlp
RUN pip3 install --no-cache-dir -U yt-dlp && \
    ln -sf /usr/local/bin/yt-dlp /usr/local/bin/youtube-dl

# Copy only what's needed for runtime
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled app
COPY --from=builder /app/dist ./dist

# Prepare directories
RUN mkdir -p public tmp && chmod -R 755 public tmp

# Environment setup
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start app
CMD ["npm", "start"]