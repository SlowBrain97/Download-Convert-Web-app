    
import fs from 'node:fs';
import { logger } from './logger.js';

export const instaSessionPath = '/tmp/instaSession.txt';
export const instaCookiesPath = '/tmp/instaCookies.txt';

if (process.env.INSTA_SESSION_BASE64) {
  const sessionContent = Buffer.from(
    process.env.INSTA_SESSION_BASE64,
    'base64'
  ).toString('utf-8');
  fs.writeFileSync(instaSessionPath, sessionContent);
  logger.info('✅ Session file written');
} else {
  logger.warn('⚠️ No session provided, may fail for restricted videos');
}

if (process.env.INSTA_COOKIES_BASE64) {
  const cookiesContent = Buffer.from(
    process.env.INSTA_COOKIES_BASE64,
    'base64'
  ).toString('utf-8');
  fs.writeFileSync(instaCookiesPath, cookiesContent);
  logger.info('✅ Cookies file written');
} else {
  logger.warn('⚠️ No cookies provided, may fail for restricted videos');
}
