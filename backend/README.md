# Express TS Media Server

A production-ready Express + TypeScript template with:

- Media convert (ffmpeg)
- Video/Audio download (YouTube via ytdl-core, direct URL fallback)
- Basic Docs convert (docx->html via mammoth, xlsx->csv via xlsx; optional LibreOffice for broad conversion)
- Server-Sent Events (SSE) progress tracking per task
- Temp file management and cleanup scheduler
- Modular architecture (controllers, services, middlewares, routes, utils)

## Quick Start

1. Install deps
```
npm i
```

2. Copy env
```
cp .env.example .env
```

3. Dev
```
npm run dev
```

4. Build & Start
```
npm run build && npm start
```

Open: http://localhost:3000/health

## Deploy

- Railway/Render: Works out-of-the-box.
- Vercel: Use Serverless functions or enable Node server via `vercel.json` and `npm start`. Traditional long-lived SSE may be limited on Vercel free tier.

## API

- POST `/api/media/convert` multipart/form-data
  - fields: `inputFormat`, `outputFormat`, `file` (the upload)
  - returns: `{ taskId }` then subscribe to SSE `/api/progress/:taskId`

- POST `/api/download` application/json
  - body: `{ url: string, fileType?: 'video'|'audio' }`
  - returns: `{ taskId }` then SSE `/api/progress/:taskId`

- POST `/api/docs/convert` multipart/form-data
  - fields: `inputFormat`, `outputFormat`, `file`
  - returns: `{ taskId }`

- GET `/api/progress/:taskId` (SSE)
  - stream: `{ event: 'progress'|'complete'|'error', data: ... }`

- GET `/public/:filename` static files (output)

## Notes

- ffmpeg is bundled via `ffmpeg-static`, no system install needed.
- Broad docs conversion (e.g. docx->pdf, pptx->pdf) requires LibreOffice. If available, `libreoffice-convert` will be used. Otherwise 501 is sent.
- Temp files are stored in `./tmp` by default and auto-cleaned periodically.
