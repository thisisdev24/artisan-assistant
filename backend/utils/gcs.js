const { Storage } = require('@google-cloud/storage');
const path = require('path');
const storage = new Storage({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
const bucketName = process.env.GCS_BUCKET;
if (!bucketName) throw new Error('GCS_BUCKET not set in env');
const bucket = storage.bucket(bucketName);

async function uploadBuffer(buffer, destPath, contentType = 'image/jpeg') {
  const file = bucket.file(destPath);
  await file.save(buffer, { contentType, resumable: false });
  await file.setMetadata({ cacheControl: 'public, max-age=31536000' });
  return destPath;
}

async function getSignedReadUrl(destPath, expiresMs = 60 * 60 * 1000) {
  const file = bucket.file(destPath);
  const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + expiresMs });
  return url;
}

async function deleteObject(destPath) {
  const file = bucket.file(destPath);
  await file.delete().catch(err => { if (err.code !== 404) throw err; });
}

module.exports = { uploadBuffer, getSignedReadUrl, deleteObject };
