const sharp = require('sharp');

async function createThumbnailBuffer(buffer, width = 320) {
  return sharp(buffer).resize({ width }).jpeg({ quality: 80 }).toBuffer();
}

async function createLargeThumbnailBuffer(buffer, width = 640) {
  return sharp(buffer).resize({ width }).jpeg({ quality: 80 }).toBuffer();
}

async function createHighResThumbnailBuffer(buffer, width = 1024) {
  return sharp(buffer).resize({ width }).jpeg({ quality: 80 }).toBuffer();
}

module.exports = { createThumbnailBuffer, createLargeThumbnailBuffer, createHighResThumbnailBuffer };
