# ---------- Build Stage ----------
FROM node:18-bookworm AS builder

WORKDIR /app

# Copy package and config files
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

# Update apt and install minimal runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
      ffmpeg curl ca-certificates \
      libreoffice libreoffice-writer libreoffice-calc \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Remove EXTERNALLY-MANAGED marker (safe inside container)
RUN rm -f /usr/lib/python*/EXTERNALLY-MANAGED

# Install latest stable yt-dlp (explicit version pin)
RUN pip3 install --no-cache-dir yt-dlp==2025.10.14 && \
    ln -sf /usr/local/bin/yt-dlp /usr/local/bin/youtube-dl

# Verify yt-dlp & ffmpeg installation
RUN yt-dlp --version && ffmpeg -version

# Copy only what’s needed for runtime
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled app
COPY --from=builder /app/dist ./dist

# Prepare directories for downloads and temp files
RUN mkdir -p public tmp && chmod -R 755 public tmp

# Environment setup
ENV NODE_ENV=production
ENV PORT=10000

# Expose app port
EXPOSE 10000

# Health check (to auto-restart if something’s wrong)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the app
CMD ["npm", "start"]