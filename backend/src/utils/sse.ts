import { Request, Response } from 'express';

export function initSSE(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

export function sendSSE(res: Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  if(res.flushHeaders) 
    res.flushHeaders();
}

export function keepAlive(res: Response) {
  const iv = setInterval(() => {
    try {
      res.write(`: keep-alive\n\n`);
    } catch {
      clearInterval(iv);
    }
  }, 15000);
  return () => clearInterval(iv);
}
