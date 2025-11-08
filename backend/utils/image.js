const sharp = require('sharp');

async function createThumbnailBuffer(buffer, width = 320) {
  return sharp(buffer).resize({ width }).jpeg({ quality: 80 }).toBuffer();
}

module.exports = { createThumbnailBuffer };
