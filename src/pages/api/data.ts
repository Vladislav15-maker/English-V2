import { Redis } from '@upstash/redis';
import type { NextApiRequest, NextApiResponse } from 'next';

const redis = Redis.fromEnv();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'PUT') {
    try {
      // Сохраняем все состояние в один ключ 'app-state'
      await redis.set('app-state', JSON.stringify(req.body));
      
      // Публикуем событие в канал 'state-changes'
      await redis.publish('state-changes', 'updated');

      return res.status(200).json({ message: 'Data saved' });
    } catch (error) {
      console.error("Upstash PUT error:", error);
      return res.status(500).json({ error: 'Failed to save data' });
    }
  } 
  
  else if (req.method === 'GET') {
    try {
      // Получаем все состояние из ключа 'app-state'
      const data = await redis.get('app-state');
      if (data) {
        return res.status(200).json({ record: data }); // Оборачиваем в `record`, как ожидает AppContext
      } else {
        return res.status(404).json({ error: 'No data found' });
      }
    } catch (error) {
      console.error("Upstash GET error:", error);
      return res.status(500).json({ error: 'Failed to get data' });
    }
  } 
  
  else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}