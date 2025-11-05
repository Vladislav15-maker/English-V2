import { Redis } from '@upstash/redis';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const subscriber = Redis.fromEnv();

  // Keep-alive каждые 20 секунд
  const intervalId = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 20000);

  try {
    // Асинхронный итератор для подписки на канал
    for await (const message of subscriber.psubscribe('state-changes')) {
      // message приходит как объект { channel, data }
      if (message.data === 'updated') {
        res.write(`data: ${message.data}\n\n`);
      }
    }
  } catch (error) {
    console.error("SSE listener error:", error);
  }

  req.on('close', () => {
    clearInterval(intervalId);
    subscriber.unsubscribe('state-changes').catch(console.error);
    subscriber.quit().catch(console.error);
  });
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
