// backend/test/listings.test.js
// Mock GCS helpers to write locally and return fake URLs
jest.mock('../utils/gcs', () => {
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.resolve(__dirname, '..', 'uploads_test');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  return {
    uploadBuffer: async (buffer, destPath, contentType) => {
      const filename = path.basename(destPath);
      const out = path.join(uploadsDir, filename);
      await fs.promises.writeFile(out, buffer);
      return destPath;
    },
    getSignedReadUrl: async (destPath, expiresMs) => {
      // return a stable dummy URL for tests
      return `http://test.local/${encodeURIComponent(path.basename(destPath))}`;
    },
    deleteObject: async (destPath) => {
      try { await fs.promises.unlink(path.join(__dirname, '..', 'uploads_test', path.basename(destPath))); } catch(e){/*ignore*/ }
    }
  };
});

const request = require('supertest');
const app = require('../app'); // express app (exported)
const mongoose = require('mongoose');
const sharp = require('sharp');

describe('Listings API', () => {
  it('creates and fetches a listing (smoke)', async () => {
    // create a valid small JPEG buffer
    const imgBuf = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: { r: 220, g: 100, b: 60 }
      }
    }).jpeg({ quality: 80 }).toBuffer();

    const res = await request(app)
      .post('/api/listings')
      .field('title', 'Test item')
      .field('price', '12.34')
      .attach('images', imgBuf, 'test.jpg'); // small valid JPEG bytes

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');

    const get = await request(app).get(`/api/listings/${res.body._id}`);
    expect(get.statusCode).toBe(200);
    expect(get.body._id).toBe(res.body._id);
  }, 20000);
});
