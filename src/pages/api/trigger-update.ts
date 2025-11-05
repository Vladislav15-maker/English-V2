import type { NextApiRequest, NextApiResponse } from 'next';
import Pusher from 'pusher';

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
  if (req.method === 'POST') {
    try {
      await pusher.trigger('main-channel', 'state-updated', {
        message: 'data has been updated'
      });
      res.status(200).json({ success: true, message: 'Update triggered' });
    } catch (error) {
      console.error('Pusher trigger error:', error);
      res.status(500).json({ success: false, message: 'Failed to trigger update' });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}