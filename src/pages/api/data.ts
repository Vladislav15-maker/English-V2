import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`[${req.method}] Request received for /api/data`);

  // Проверка наличия ключей
  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID || !supabaseUrl || !supabaseKey) {
    console.error('SERVER ERROR: One or more environment variables are missing!');
    return res.status(500).json({ error: 'Server configuration error: Missing environment variables.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'PUT') {
    try {
      console.log('Attempting to save data to JSONBin...');
      const saveResponse = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
        },
        body: JSON.stringify(req.body),
      });

      if (!saveResponse.ok) {
        console.error(`JSONBin PUT Error: ${saveResponse.status} ${saveResponse.statusText}`);
        throw new Error('Failed to save data to JSONBin');
      }
      console.log('Data successfully saved to JSONBin.');

      console.log('Attempting to send real-time event via Supabase...');
      const channel = supabase.channel('main-channel');
      const { error: supabaseError } = await channel.send({
        type: 'broadcast',
        event: 'state-updated',
        payload: { message: 'data has changed' },
      });

      if (supabaseError) {
        console.error('Supabase send error:', supabaseError);
        // Не прерываем выполнение, просто логируем ошибку
      } else {
        console.log('Supabase event sent successfully.');
      }
      
      return res.status(200).json({ message: 'Data saved and event sent' });

    } catch (error: any) {
      console.error("CRITICAL ERROR in PUT /api/data:", error.message);
      return res.status(500).json({ error: 'Failed to process PUT request.' });
    }

  } else if (req.method === 'GET') {
    try {
      console.log('Attempting to fetch data from JSONBin...');
      const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
        },
      });

      if (!response.ok) {
        console.error(`JSONBin GET Error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ error: 'Failed to fetch data from JSONBin' });
      }

      const data = await response.json();
      console.log('Data successfully fetched from JSONBin.');
      return res.status(200).json(data);

    } catch (error: any) {
      console.error("CRITICAL ERROR in GET /api/data:", error.message);
      return res.status(500).json({ error: 'Failed to process GET request.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}