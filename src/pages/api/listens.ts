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
  console.log("Client connected to SSE.");

  // Создаем два отдельных клиента, как рекомендует Upstash для Pub/Sub
  const subscriber = Redis.fromEnv();
  const publisher = Redis.fromEnv(); // Этот клиент нужен, чтобы соединение не "засыпало"

  // Подписываемся на канал. Теперь это делается без callback'а.
  await subscriber.subscribe('state-changes');

  // Устанавливаем таймер для поддержания соединения (keep-alive)
  const intervalId = setInterval(() => {
    // Отправляем комментарий клиенту, чтобы соединение не закрывалось браузером
    res.write(': keep-alive\n\n');
  }, 20000); // каждые 20 секунд

  // Функция для прослушивания сообщений
  const listen = async () => {
    try {
      // Это правильный способ слушать сообщения
      const messages = await subscriber.psubscribe('state-changes');
      for (const message of messages) {
        if (message.channel === 'state-changes' && message.data === 'updated') {
            res.write(`data: ${message.data}\n\n`);
        }
      }
    } catch (error) {
      console.error("Error in SSE listener:", error);
    }
  }

  // Запускаем прослушивание
  listen();

  // Когда клиент отключается (закрывает вкладку)
  req.on('close', () => {
    console.log("Client disconnected from SSE. Cleaning up.");
    clearInterval(intervalId);
    subscriber.unsubscribe('state-changes');
    subscriber.quit();
    publisher.quit(); // Закрываем оба соединения
  });
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};