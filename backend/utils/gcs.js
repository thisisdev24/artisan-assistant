// backend/utils/gcs.js
// UBLA-aware GCS helper. Avoids per-object ACL changes when Uniform Bucket-Level Access is enabled.
//
// Required env vars:
//   GCS_BUCKET
//   (optional) GOOGLE_APPLICATION_CREDENTIALS -> path to service account JSON
//
// Usage:
//   const { uploadBuffer, getPublicUrl, getSignedReadUrl, deleteObject, isBucketPubliclyReadable } = require('./utils/gcs');

const fs = require('fs');
try { require('dotenv').config(); } catch (e) { /* dotenv optional */ }

const { Storage } = require('@google-cloud/storage');

const BUCKET_NAME = process.env.GCS_BUCKET;
const KEYFILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS_PATH;
// For Production
const jsonString = JSON.parse(process.env.SA_KEY);
if (jsonString) {
  try {
    // 1. Parse the JSON string from the environment variable into a JS object
    const jsonObject = JSON.parse(jsonString);

    // 2. Stringify the JS object with formatting for the file (optional, but good practice)
    const outputJsonString = JSON.stringify(jsonObject, null, 2);

    // 3. Write the string to a new JSON file
    fs.writeFile('/tmp/output.json', outputJsonString, (err) => {
      if (err) {
        console.error('Error writing file', err);
      } else {
        console.log('Successfully created output.json');
      }
    });
  } catch (e) {
    console.error('Failed to parse JSON from environment variable', e);
  }
} else {
  console.log('SA_KEY environment var is not set.');
}

if (!BUCKET_NAME) {
  throw new Error('GCS_BUCKET is not set. Create a .env or export GCS_BUCKET and retry.');
}

const storage = new Storage({ keyFilename: '/tmp/output.json' || KEYFILE });
const bucket = storage.bucket(BUCKET_NAME);

// Cache the UBLA + IAM public check results
let _ublaChecked = false;
let _ublaEnabled = false;
let _publicCheckChecked = false;
let _bucketPubliclyReadable = false;

/**
 * Internal: check if Uniform bucket-level access (UBLA) is enabled for the bucket.
 * Caches result after first call.
 */
async function _checkUbla() {
  if (_ublaChecked) return _ublaEnabled;
  try {
    const [meta] = await bucket.getMetadata();
    const iamCfg = meta.iamConfiguration || meta.iam_configuration || {};
    const ubla = (iamCfg.uniformBucketLevelAccess && iamCfg.uniformBucketLevelAccess.enabled)
              || (iamCfg.uniformBucketLevelAccess && iamCfg.uniformBucketLevelAccess.enabled === 'true');
    _ublaEnabled = !!ubla;
  } catch (err) {
    console.warn('gcs: could not read bucket metadata to detect UBLA. Assuming UBLA=false. Error:', err && err.message ? err.message : err);
    _ublaEnabled = false;
  } finally {
    _ublaChecked = true;
    return _ublaEnabled;
  }
}

/**
 * Internal: check if bucket IAM already grants allUsers roles/storage.objectViewer (bucket-level public).
 * Caches result.
 */
async function _checkBucketPublicBinding() {
  if (_publicCheckChecked) return _bucketPubliclyReadable;
  try {
    const [policy] = await bucket.iam.getPolicy();
    _bucketPubliclyReadable = Array.isArray(policy.bindings) && policy.bindings.some(b =>
      b.role === 'roles/storage.objectViewer' && Array.isArray(b.members) && b.members.includes('allUsers')
    );
  } catch (err) {
    console.warn('gcs: could not read bucket IAM policy. Assuming not public. Error:', err && err.message ? err.message : err);
    _bucketPubliclyReadable = false;
  } finally {
    _publicCheckChecked = true;
    return _bucketPubliclyReadable;
  }
}

/**
 * Upload a buffer to GCS.
 * - buffer: Buffer
 * - destPath: path inside the bucket (e.g. "images/listing_xxx.jpg")
 * - contentType: MIME type, default 'image/jpeg'
 * - tryMakePublic: whether to attempt a per-object makePublic (default true) - will be skipped if UBLA=true
 *
 * Returns destPath (same as earlier implementation). Use getPublicUrl(destPath) to construct a public URL (if bucket is public).
 */
async function uploadBuffer(buffer, destPath, contentType = 'image/jpeg', tryMakePublic = true) {
  const file = bucket.file(destPath);

  // Save buffer (non-resumable)
  await file.save(buffer, { contentType, resumable: false });

  // Set long cache-control
  try {
    await file.setMetadata({ cacheControl: 'public, max-age=31536000' });
  } catch (err) {
    console.warn('gcs: failed to set metadata for', destPath, err && err.message ? err.message : err);
  }

  if (tryMakePublic) {
    const ubla = await _checkUbla();
    if (ubla) {
      // When UBLA enabled, skip per-object makePublic (not allowed); must rely on bucket-level IAM
      console.info(`gcs: UBLA is enabled for bucket ${BUCKET_NAME}. Skipping per-object makePublic() for ${destPath}.`);
    } else {
      try {
        await file.makePublic();
        console.info(`gcs: made object public: ${destPath}`);
      } catch (err) {
        // Log but do not throw — keep migration resilient
        console.warn(`gcs: makePublic() failed for ${destPath}:`, err && err.message ? err.message : err);
      }
    }
  }

  return destPath;
}

/**
 * Return a public URL (works if bucket is publicly readable).
 */
async function getPublicUrl(destPath) {
  const p = destPath.startsWith('/') ? destPath.substring(1) : destPath;
  return `https://storage.googleapis.com/${BUCKET_NAME}/${encodeURI(p)}`;
}

/**
 * Generate a signed read URL (kept for compatibility)
 */
async function getSignedReadUrl(destPath, expiresMs = 60 * 60 * 1000) {
  const file = bucket.file(destPath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresMs
  });
  return url;
}

/**
 * Delete an object if it exists. Ignores 404.
 */
async function deleteObject(destPath) {
  const file = bucket.file(destPath);
  await file.delete().catch(err => {
    if (err && err.code !== 404) throw err;
  });
}

/**
 * Public helper: returns true if the bucket is publicly readable (allUsers:objectViewer binding present).
 * Useful to decide whether getPublicUrl(destPath) will actually work.
 */
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
