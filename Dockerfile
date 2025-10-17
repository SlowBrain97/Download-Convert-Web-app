# Build stage
FROM node:18-bullseye AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY tsconfig.json ./


RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Build TypeScript (src -> dist)
RUN npm run build

# Production stage
FROM node:18-bullseye-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (youtube-dl alternative, more reliable)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Create symlink for youtube-dl to yt-dlp (backward compatibility)
RUN ln -s /usr/local/bin/yt-dlp /usr/local/bin/youtube-dl

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

RUN mkdir -p public tmp && \
    chmod -R 755 public tmp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Expose port (Render uses PORT env variable)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:10000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application using npm start script
CMD ["npm", "start"]