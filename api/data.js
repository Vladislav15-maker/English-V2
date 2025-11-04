
// This is a Vercel Serverless Function that acts as a secure proxy to JSONBin.io
// It solves the CORS issue by making requests from the server-side.
export default async function handler(req, res) {
  const BIN_ID = process.env.JSONBIN_BIN_ID;
  const API_KEY = process.env.JSONBIN_API_KEY;

  if (!API_KEY || !BIN_ID) {
    return res.status(500).json({ error: 'Server configuration error: API keys are missing.' });
  }

  const LATEST_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;
  const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  if (req.method === 'GET') {
    try {
      const response = await fetch(LATEST_URL, {
        headers: { 'X-Master-Key': API_KEY },
      });
      if (!response.ok) {
        if (response.status === 404) {
             return res.status(404).json({ message: 'Bin not found on JSONBin.io' });
        }
        throw new Error(`Failed to fetch from JSONBin: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error('Proxy GET Error:', error);
      return res.status(500).json({ error: error.message });
    }
  } 
  
  if (req.method === 'PUT') {
    try {
      const response = await fetch(BIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY,
          'X-Bin-Versioning': 'false',
        },
        body: JSON.stringify(req.body),
      });
      if (!response.ok) {
        throw new Error(`Failed to update JSONBin: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error('Proxy PUT Error:', error);
      return res.status(500).json({ error: error.message });
    }
  } 
  
  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
