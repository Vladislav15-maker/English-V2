import { Redis } from '@upstash/redis';
import type { NextApiRequest, NextApiResponse } from 'next';

// Redis.fromEnv() автоматически читает переменные окружения Vercel
const redis = Redis.fromEnv();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'PUT') {
    try {
      await redis.set('app-state', req.body); // Сохраняем как строку
      await redis.publish('state-changes', 'updated');
      return res.status(200).json({ message: 'Data saved' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to save data' });
    }
  } 
  
  else if (req.method === 'GET') {
    try {
      const data = await redis.get('app-state');
      if (data) {
        // Оборачиваем в `record`, как ожидает AppContext
        return res.status(200).json({ record: data });
      } else {
        return res.status(404).json({ error: 'No data found' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get data' });
    }
  } 
  
  else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}