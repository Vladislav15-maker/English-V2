import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Ваши ключи JSONBin остаются без изменений
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;

// Инициализируем Supabase на сервере для отправки сообщений
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Используем anon key, т.к. нам не нужны права администратора
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'PUT') {
    try {
      // 1. Сохраняем данные в JSONBin, как и раньше
      await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY!,
        },
        body: JSON.stringify(req.body),
      });

      // 2. Отправляем real-time сигнал через Supabase
      const channel = supabase.channel('main-channel');
      await channel.send({
        type: 'broadcast',
        event: 'state-updated',
        payload: { message: 'data has changed' },
      });
      
      return res.status(200).json({ message: 'Data saved and event sent' });

    } catch (error) {
        console.error("Error in /api/data:", error);
        return res.status(500).json({ error: 'Failed to process request' });
    }

  } else if (req.method === 'GET') {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': JSONBIN_API_KEY!,
      },
    });
    if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch data' });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}