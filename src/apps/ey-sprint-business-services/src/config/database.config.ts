import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGO_URI,
  serverSelectionTimeoutMs: parseInt(
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? '5000',
    10,
  ),
}));

