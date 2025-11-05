import { Redis } from '@upstash/redis';
import type { NextApiRequest, NextApiResponse } from 'next';

// Создаем ОДНОГО клиента Redis, который будет использоваться для всех подписок.
// Upstash Redis спроектирован для обработки множества одновременных подключений через один инстанс.
const redis = Redis.fromEnv();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Настраиваем заголовки для Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  console.log("Client connected to SSE.");

  // Создаем дубликат клиента специально для подписки.
  // Это хорошая практика, чтобы не блокировать основной клиент.
  const subscriber = redis.duplicate();

  // Используем `psubscribe`, который является стандартным для этой библиотеки.
  // Он принимает имя канала и функцию-обработчик.
  await subscriber.psubscribe('state-changes', (channel, message) => {
    console.log(`Received message '${message}' from channel '${channel}'`);
    if (message === 'updated') {
      res.write(`data: ${message}\n\n`);
    }
  });

  // Когда клиент отключается (закрывает вкладку), мы отписываемся и закрываем соединение.
  req.on('close', () => {
    console.log("Client disconnected from SSE. Unsubscribing and quitting.");
    subscriber.punsubscribe('state-changes');
    subscriber.quit();
  });
}

// Эта конфигурация остается критически важной для Next.js
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};