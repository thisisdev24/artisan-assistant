/**
 * models/artisan/index.js
 * Loads and registers all models inside the artisan folder.
 * Scans admin/, user/, artisan/ subfolders automatically.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function loadModelsFromFolder(folderPath) {
  const models = {};

  fs.readdirSync(folderPath).forEach(file => {
    const fullPath = path.join(folderPath, file);

    // Skip directories
    if (fs.lstatSync(fullPath).isDirectory()) return;

    // Only load JS files
    if (file.endsWith('.js')) {
      const model = require(fullPath);

      // Mongoose model name is the first argument in mongoose.model()
      if (model && model.modelName) {
        models[model.modelName] = model;
      }
    }
  });

  return models;
}

module.exports = () => {
  const baseDir = __dirname;

  const adminDir = path.join(baseDir, 'admin');
  const userDir = path.join(baseDir, 'user');
  const artisanDir = path.join(baseDir, 'artisan');

  const adminModels = loadModelsFromFolder(adminDir);
  const userModels = loadModelsFromFolder(userDir);
  const artisanModels = loadModelsFromFolder(artisanDir);

  return {
    ...adminModels,
    ...userModels,
    ...artisanModels
  };
};
