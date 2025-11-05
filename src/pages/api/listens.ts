import { Redis } from '@upstash/redis';
import type { NextApiRequest, NextApiResponse } from 'next';

// Эта функция будет обрабатывать каждого клиента индивидуально
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

  // Создаем НОВОЕ соединение Redis специально для этого подписчика
  const subscriber = Redis.fromEnv();
  
  // Подписываемся на нужный нам канал
  await subscriber.subscribe('state-changes');

  // Используем цикл для прослушивания сообщений
  // Этот цикл будет "висеть" до тех пор, пока клиент не отключится
  try {
    for await (const message of subscriber.listen()) {
      if (typeof message === 'string') {
        // Отправляем данные клиенту в правильном формате SSE
        res.write(`data: ${message}\n\n`);
      }
    }
  } catch (error) {
    console.error("Error in SSE listener loop:", error);
  } finally {
    // Этот блок выполнится, когда клиент закроет соединение
    console.log("Client disconnected from SSE. Unsubscribing...");
    await subscriber.unsubscribe('state-changes');
    // Закрываем соединение, чтобы не создавать утечек
    await subscriber.quit();
  }
}

// Этот флаг важен для Next.js, чтобы он не трогал тело ответа
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true, // Говорим Next.js, что мы сами управляем ответом
  },
};