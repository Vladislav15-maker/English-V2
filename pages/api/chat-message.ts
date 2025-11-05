import type { NextApiRequest, NextApiResponse } from 'next';
import Pusher from 'pusher';
import { ChatMessage } from '../../types'; // Убедитесь, что путь к типам правильный

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { chatId, message }: { chatId: string; message: ChatMessage } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({ success: false, message: 'chatId and message are required' });
    }

    await pusher.trigger('main-channel', 'new-message', {
      chatId,
      message,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Pusher chat trigger error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
}