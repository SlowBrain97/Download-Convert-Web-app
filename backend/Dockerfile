# ---------- Build Stage ----------
FROM node:18-bookworm AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm install --ignore-scripts

COPY . .
RUN npm run build



# ---------- Production Stage ----------
FROM node:18-bookworm-slim AS production

WORKDIR /app

ARG CACHE_BUST=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
      ffmpeg curl ca-certificates \
      libreoffice libreoffice-writer libreoffice-calc \
    && apt-get clean && rm -rf /var/lib/apt/lists/*


RUN rm -f /usr/lib/python*/EXTERNALLY-MANAGED

RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel


RUN pip3 install --no-cache-dir --upgrade --pre \
    "yt-dlp[default,curl-cffi]"

RUN pip3 install --no-cache-dir --upgrade instaloader


RUN yt-dlp --version && \
    instaloader --version && \
    ffmpeg -version

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

RUN mkdir -p public tmp && chmod -R 755 public tmp

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["npm", "start"]
