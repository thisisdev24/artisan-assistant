const app = require('../backend/app');
const mongoose = require('mongoose');

// Note: We don't call app.listen() here. 
// Vercel handles the invocation of the app.
module.exports = app;