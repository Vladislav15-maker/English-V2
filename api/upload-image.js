import { v2 as cloudinary } from 'cloudinary';
import Busboy from 'busboy';

cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const busboy = Busboy({ headers: req.headers });
  let uploadPromise = new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'english-course' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          reject(new Error('Upload to Cloudinary failed.'));
        } else {
          resolve(result);
        }
      }
    );

    busboy.on('file', (fieldname, file) => {
      file.pipe(stream);
    });

    busboy.on('finish', () => {
      // The uploadPromise will resolve or reject on its own
    });
    
    req.pipe(busboy);
  });

  uploadPromise
    .then(result => res.status(200).json({ secure_url: result.secure_url }))
    .catch(error => res.status(500).json({ error: error.message }));
}