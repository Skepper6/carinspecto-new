import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { HttpError } from './helpers.js';

// DigitalOcean Spaces (S3-compatible). The bucket stays private; only this server reads and writes it.
const { DO_SPACES_BUCKET: bucket, DO_SPACES_ENDPOINT: endpoint, DO_SPACES_KEY: key, DO_SPACES_SECRET: secret, DO_SPACES_REGION: region } = process.env;

export const storageEnabled = Boolean(bucket && endpoint && key && secret);

const client = storageEnabled ? new S3Client({
  region: region || 'us-east-1', endpoint, forcePathStyle: true,
  credentials: { accessKeyId: key, secretAccessKey: secret },
  requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',   // Spaces does not need the newer checksum headers
}) : null;

const wrap = (e) => { console.error('Storage error:', e?.name, e?.message); return new HttpError(502, 'Could not reach the file storage. Please try again.'); };

export async function putObject(objectKey, body, contentType) {
  try { await client.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: body, ContentType: contentType })); }
  catch (e) { throw wrap(e); }
}

export async function getObject(objectKey) {
  try {
    const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
    return { body: Buffer.from(await r.Body.transformToByteArray()), contentType: r.ContentType || 'application/octet-stream' };
  } catch (e) {
    if (e?.name === 'NoSuchKey') return null;
    throw wrap(e);
  }
}

export async function deleteObject(objectKey) {
  try { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey })); }
  catch (e) { throw wrap(e); }
}
