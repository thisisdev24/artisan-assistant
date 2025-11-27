// scripts/migrate_images_to_gcs.js
// Migration: download external images, create sizes, upload to GCS and update Listing.images
// Now includes progress + ETA display
//
// Required env:
//   MONGO_URI, GCS_BUCKET, GOOGLE_APPLICATION_CREDENTIALS (if used by utils/gcs)
// Optional env:
//   DRY_RUN=true, CONCURRENCY=6, START_SKIP=0
//
// Usage:
//   node scripts/migrate_images_to_gcs.js

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const pLimit = require('p-limit');
const crypto = require('crypto');
const path = require('path');

// update these require paths if your project structure differs
const { uploadBuffer, getPublicUrl } = require('../utils/gcs'); // assumes utils/gcs.js present
const { createThumbnailBuffer, createLargeThumbnailBuffer, createHighResThumbnailBuffer } = require('../utils/image'); // sharp helpers
const Listing = require('../models/Listing');

const {
  MONGO_URI,
  GCS_BUCKET,
  DRY_RUN = 'false',
  CONCURRENCY = '6',
  START_SKIP = '0'
} = process.env;

if (!MONGO_URI) throw new Error('MONGO_URI required');

const isDry = DRY_RUN === 'true';
const concurrency = parseInt(CONCURRENCY, 10);
const startSkip = parseInt(START_SKIP, 10);

function isGcsUrl(url) {
  if (!url) return false;
  // adjust detection as needed
  return url.includes(`storage.googleapis.com/${GCS_BUCKET}`) || url.includes(`${GCS_BUCKET}.storage.googleapis.com`);
}

function makeObjectPath(listingId, idx, variant, ext = '.jpg') {
  const short = crypto.randomBytes(4).toString('hex');
  return `images/listing_${listingId}_${idx}_${variant}_${short}${ext}`;
}

async function downloadBuffer(url) {
  const axiosCfg = {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxContentLength: 50 * 1024 * 1024,
    headers: { 'User-Agent': 'artis-migration-script/1.0' }
  };
  const resp = await axios.get(url, axiosCfg);
  const buffer = Buffer.from(resp.data);
  const contentType = resp.headers['content-type'] || 'image/jpeg';
  return { buffer, contentType };
}

function publicUrlFor(pathName) {
  return getPublicUrl(pathName); // uses your utils/gcs.getPublicUrl
}

function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '??:??:??';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

async function migrateOneListing(doc) {
  const listingId = String(doc._id);
  if (!Array.isArray(doc.images) || doc.images.length === 0) {
    return { skipped: true, note: 'no images' };
  }

  const backupField = `images_backup_migration_${(new Date()).toISOString().replace(/[:.]/g,'-')}`;

  const newImages = [];
  let changed = false;

  for (let i = 0; i < doc.images.length; i++) {
    const imgObj = doc.images[i] || {};
    const sourceUrl = imgObj.hi_res || imgObj.large || imgObj.thumb || Object.values(imgObj).find(v => typeof v === 'string' && v.startsWith('http')) || null;

    if (!sourceUrl) {
      newImages.push(imgObj);
      continue;
    }
    if (isGcsUrl(sourceUrl)) {
      newImages.push(imgObj);
      continue;
    }

    try {
      const { buffer: originalBuf, contentType } = await downloadBuffer(sourceUrl);
      const ext = (contentType && contentType.split('/')[1]) ? `.${contentType.split('/')[1].split(';')[0]}` : '.jpg';

      let thumbBuf, largeBuf, hiResBuf;
      try {
        thumbBuf = await createThumbnailBuffer(originalBuf, 320);
        largeBuf = await createLargeThumbnailBuffer(originalBuf, 640);
        hiResBuf = await createHighResThumbnailBuffer(originalBuf, 1024);
      } catch (e) {
        // fallback to original buffer if sharp fails
        thumbBuf = originalBuf;
        largeBuf = originalBuf;
        hiResBuf = originalBuf;
      }

      const thumbPath = makeObjectPath(listingId, i, 'thumb', ext);
      const largePath = makeObjectPath(listingId, i, 'large', ext);
      const hiPath = makeObjectPath(listingId, i, 'hires', ext);

      // uploadBuffer should be UBLA-aware (as we previously patched utils/gcs.js)
      await uploadBuffer(thumbBuf, thumbPath, contentType).catch(err => { throw new Error('upload thumb: ' + err.message); });
      await uploadBuffer(largeBuf, largePath, contentType).catch(err => { throw new Error('upload large: ' + err.message); });
      await uploadBuffer(hiResBuf, hiPath, contentType).catch(err => { throw new Error('upload hi: ' + err.message); });

      const thumbUrl = publicUrlFor(thumbPath);
      const largeUrl = publicUrlFor(largePath);
      const hiUrl = publicUrlFor(hiPath);

      const newObj = {
        ...imgObj,
        thumb: thumbUrl,
        large: largeUrl,
        hi_res: hiUrl
      };

      newImages.push(newObj);
      changed = true;
    } catch (err) {
      // keep original and continue
      console.warn(`[warning] listing ${listingId} idx=${i} failed to migrate image: ${err.message || err}`);
      newImages.push(imgObj);
    }
  }

  if (!changed) {
    return { skipped: true, note: 'already-migrated' };
  }

  if (isDry) {
    return { updated: true, dry: true };
  }

  const backupFieldName = backupField;
  const updateDoc = {
    $set: { images: newImages }
  };
  updateDoc.$set[backupFieldName] = doc.images;

  await Listing.updateOne({ _id: doc._id }, updateDoc).exec();

  return { updated: true };
}

async function run() {
  console.log('Connecting to Mongo...');
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to Mongo');

  // compute total to process (respect START_SKIP)
  const totalDocs = await Listing.countDocuments();
  const totalToProcess = Math.max(0, totalDocs - startSkip);
  console.log(`Found ${totalDocs} listings in DB. START_SKIP=${startSkip} -> will process ${totalToProcess} listings.`);

  const limiter = pLimit(concurrency);

  let skipped = 0, updated = 0, failed = 0;
  let processed = 0;

  const startTime = Date.now();

  // progress printing helper
  function printProgress() {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rate = processed > 0 ? processed / Math.max(1, elapsedSec) : 0;
    const remaining = Math.max(0, totalToProcess - processed);
    const etaSec = rate > 0 ? remaining / rate : Infinity;
    const pct = totalToProcess > 0 ? (processed / totalToProcess) * 100 : 0;

    const stats = [
      `processed: ${processed}/${totalToProcess}`,
      `${pct.toFixed(1)}%`,
      `updated: ${updated}`,
      `skipped: ${skipped}`,
      `failed: ${failed}`,
      `rate: ${rate.toFixed(2)} docs/s`,
      `ETA: ${formatDuration(etaSec)}`
    ].join(' | ');

    // overwrite current line if supported, else print new line
    try {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(stats);
    } catch (e) {
      console.log(stats);
    }
  }

  // Use a cursor starting at skip
  const cursor = Listing.find({}).skip(startSkip).cursor();
  const tasks = [];

  // throttle the number of outstanding promises to avoid memory blowup
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const task = limiter(() => migrateOneListing(doc)
      .then(r => {
        processed++;
        if (r && r.updated) updated++;
        else skipped++;
        printProgress();
      })
      .catch(err => {
        processed++;
        failed++;
        console.error('\n[migration error] listing', doc._id, err && err.message ? err.message : err);
        printProgress();
      }));
    tasks.push(task);

    // keep tasks array small
    if (tasks.length > concurrency * 10) {
      await Promise.all(tasks.splice(0));
    }
  }

  // wait for remaining tasks
  await Promise.all(tasks);

  // final stats
  const totalElapsedSec = (Date.now() - startTime) / 1000;
  printProgress();
  console.log('\nMigration finished.');
  console.log(`Processed: ${processed}, Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log(`Total time: ${formatDuration(totalElapsedSec)} (${totalElapsedSec.toFixed(1)} sec)`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal migration error', err && err.stack ? err.stack : err);
  process.exit(1);
});
