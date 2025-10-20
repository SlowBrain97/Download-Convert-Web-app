
import fs from 'node:fs';
import { logger } from './logger.js';


export const cookiesPath = '/tmp/cookies.txt';
      if (process.env.YT_COOKIES_BASE64) {
        const cookiesContent = Buffer.from(
          process.env.YT_COOKIES_BASE64, 
          'base64'
        ).toString('utf-8');
        fs.writeFileSync(cookiesPath, cookiesContent);
        logger.info('✅ Cookies file written');
      } else {
        logger.warn('⚠️ No cookies provided, may fail for restricted videos');
      }