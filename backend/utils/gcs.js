// backend/utils/gcs.js
const { Storage } = require('@google-cloud/storage');

// Load environment variables
const BUCKET_NAME = process.env.GCS_BUCKET;
const SA_KEY_JSON = process.env.SA_KEY; 

if (!BUCKET_NAME) {
  throw new Error('GCS_BUCKET is not set.');
}

if (!SA_KEY_JSON) {
  throw new Error('SA_KEY environment variable is missing. Add the JSON content to Vercel settings.');
}

/**
 * Initialize Storage using the JSON object directly.
 * This avoids the need for a physical file.
 */
let storageConfig = {};
try {
  // Parse the string from Vercel into a real JSON object
  storageConfig.credentials = JSON.parse(SA_KEY_JSON);
} catch (err) {
  throw new Error('Failed to parse SA_KEY JSON. Ensure the full content is pasted into Vercel.');
}

const storage = new Storage(storageConfig);
const bucket = storage.bucket(BUCKET_NAME);

let _ublaChecked = false;
let _ublaEnabled = false;
let _publicCheckChecked = false;
let _bucketPubliclyReadable = false;

async function _checkUbla() {
  if (_ublaChecked) return _ublaEnabled;
  try {
    const [meta] = await bucket.getMetadata();
    const iamCfg = meta.iamConfiguration || meta.iam_configuration || {};
    _ublaEnabled = !!(iamCfg.uniformBucketLevelAccess && iamCfg.uniformBucketLevelAccess.enabled);
  } catch (err) {
    console.warn('gcs: UBLA detection failed, assuming false:', err.message);
    _ublaEnabled = false;
  } finally {
    _ublaChecked = true;
    return _ublaEnabled;
  }
}

async function _checkBucketPublicBinding() {
  if (_publicCheckChecked) return _bucketPubliclyReadable;
  try {
    const [policy] = await bucket.iam.getPolicy();
    _bucketPubliclyReadable = Array.isArray(policy.bindings) && policy.bindings.some(b =>
      b.role === 'roles/storage.objectViewer' && b.members.includes('allUsers')
    );
  } catch (err) {
    console.warn('gcs: IAM check failed:', err.message);
    _bucketPubliclyReadable = false;
  } finally {
    _publicCheckChecked = true;
    return _bucketPubliclyReadable;
  }
}

async function uploadBuffer(buffer, destPath, contentType = 'image/jpeg', tryMakePublic = true) {
  const file = bucket.file(destPath);

  await file.save(buffer, { contentType, resumable: false });

  try {
    await file.setMetadata({ cacheControl: 'public, max-age=31536000' });
  } catch (err) {
    console.warn('gcs: metadata set failed:', err.message);
  }

  if (tryMakePublic) {
    const ubla = await _checkUbla();
    if (!ubla) {
      try {
        await file.makePublic();
      } catch (err) {
        console.warn(`gcs: makePublic() failed (ignore if UBLA is enforced):`, err.message);
      }
    }
  }
  return destPath;
}

async function getPublicUrl(destPath) {
  const p = destPath.startsWith('/') ? destPath.substring(1) : destPath;
  return `https://storage.googleapis.com/${BUCKET_NAME}/${encodeURI(p)}`;
}

async function getSignedReadUrl(destPath, expiresMs = 60 * 60 * 1000) {
  const file = bucket.file(destPath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresMs
  });
  return url;
}

async function deleteObject(destPath) {
  const file = bucket.file(destPath);
  await file.delete().catch(err => {
    if (err && err.code !== 404) throw err;
  });
}

async function isBucketPubliclyReadable() {
  return await _checkBucketPublicBinding();
}

module.exports = {
  uploadBuffer,
  getPublicUrl,
  getSignedReadUrl,
  deleteObject,
  isBucketPubliclyReadable
};