import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.R2_URL,
});

export default r2Client;

// Helper function to upload files
export async function uploadToR2(
  key: string,
  body: Buffer | string,
  contentType = 'application/octet-stream'
) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET || '',
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await r2Client.send(command);
  
  // Generate a presigned URL valid for 7 days (604800 seconds)
  // AWS Signature V4 limits presigned URLs to max 7 days
  const getCommand = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET || '',
    Key: key,
  });
  const url = await getSignedUrl(r2Client, getCommand, { expiresIn: 604800 });
  return url;
}

// Helper function to delete files
export async function deleteFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET || '',
    Key: key,
  });

  await r2Client.send(command);
}