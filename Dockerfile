# ---------- Build Stage ----------
FROM node:18-bullseye AS builder

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
FROM node:18-bullseye-slim AS production

WORKDIR /app

RUN apt-get update && \
    apt-get install -y python3.11 python3.11-distutils python3.11-venv \
    ffmpeg libreoffice libreoffice-writer libreoffice-calc \
    curl ca-certificates && \
    ln -sf /usr/bin/python3.11 /usr/bin/python3 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install latest pip and yt-dlp
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3 && \
    pip install -U yt-dlp && \
    ln -sf /usr/local/bin/yt-dlp /usr/local/bin/youtube-dl

# Copy only what’s needed for runtime
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
