import { Redis } from '@upstash/redis';
import type { NextApiRequest, NextApiResponse } from 'next';

const redis = Redis.fromEnv();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const subscriber = redis.duplicate();
  await subscriber.subscribe('state-changes', (message) => {
    res.write(`data: ${message}\n\n`);
  });

  req.on('close', () => {
    subscriber.unsubscribe('state-changes');
    subscriber.quit();
  });
}