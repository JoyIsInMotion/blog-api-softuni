import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { uploadToR2, deleteFromR2 } from '../../lib/s3';

const JWT_SECRET = process.env.JWT_SECRET || '';

interface JWTPayload {
  userId: number;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify JWT token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.substring(7);
  let decoded: JWTPayload;

  try {
    decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'POST') {
    return handleUpload(req, res, decoded.userId);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleUpload(req: NextApiRequest, res: NextApiResponse, userId: number) {
  try {
    const { file, filename } = req.body;

    if (!file || !filename) {
      return res.status(400).json({ error: 'Missing file or filename' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(file, 'base64');

    // Sanitize filename: replace spaces and special chars to avoid URL encoding issues
    const sanitizedFilename = filename
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '');

    // Generate a unique key for the file
    const timestamp = Date.now();
    const key = `uploads/${userId}/${timestamp}-${sanitizedFilename}`;

    // Determine content type
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (filename.endsWith('.png')) {
      contentType = 'image/png';
    } else if (filename.endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (filename.endsWith('.webp')) {
      contentType = 'image/webp';
    }

    // Upload to R2
    const url = await uploadToR2(key, buffer, contentType);

    return res.status(200).json({ url, key });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Missing key' });
    }

    // Delete from R2
    await deleteFromR2(key);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete file' });
  }
}
