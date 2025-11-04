import { formidable } from 'formidable';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const API_KEY = process.env.IMGBB_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: ImgBB API key is missing.' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    
    const imageFile = files.file?.[0];
    
    if (!imageFile) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const formData = new FormData();
    formData.append('image', fs.createReadStream(imageFile.filepath));

    const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
      method: 'POST',
      body: formData,
    });
    
    if (!imgbbResponse.ok) {
        const errorText = await imgbbResponse.text();
        console.error('ImgBB API Error:', errorText);
        throw new Error(`ImgBB upload failed with status: ${imgbbResponse.status}`);
    }

    const imgbbResult = await imgbbResponse.json();

    if (!imgbbResult.success) {
        console.error('ImgBB API Error:', imgbbResult);
        throw new Error('ImgBB returned an error.');
    }

    res.status(200).json({ secure_url: imgbbResult.data.url });

  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ error: 'Internal server error during file upload.' });
  }
}
