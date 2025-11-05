import { Redis } from '@upstash/redis';
import type { NextApiRequest, NextApiResponse } from 'next';

// Redis-клиент будет создаваться заново для каждого входящего запроса,
// что является стандартной практикой в serverless-окружении.
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

  // Создаем новый клиент Redis из переменных окружения
  const redis = Redis.fromEnv();

  // Подписываемся на канал. `psubscribe` является асинхронным.
  await redis.psubscribe('state-changes', (channel, message) => {
    console.log(`Received message '${message}' from channel '${channel}'`);
    if (message === 'updated') {
      // Отправляем данные клиенту, когда приходит сообщение
      res.write(`data: ${message}\n\n`);
    }
  });

  // Устанавливаем таймер, чтобы соединение не закрывалось сразу
  // (этот трюк часто необходим в serverless-среде)
  const intervalId = setInterval(() => {
    // Отправляем комментарий для поддержания соединения
    res.write(': keep-alive\n\n');
  }, 20000); // каждые 20 секунд

  // Когда клиент отключается (закрывает вкладку), мы очищаем ресурсы
  req.on('close', () => {
    console.log("Client disconnected from SSE. Cleaning up.");
    clearInterval(intervalId);
    // Отписываемся и закрываем соединение
    redis.punsubscribe('state-changes');
    redis.quit();
  });
}

// Эта конфигурация остается критически важной для Next.js
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};