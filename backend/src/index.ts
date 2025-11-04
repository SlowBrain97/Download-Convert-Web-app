import app from './app.js';
import { env } from './utils/env.js';
import { logger } from './utils/logger.js';

const port = Number(env('PORT', '10000'));

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
