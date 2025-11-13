require("dotenv").config();
const mongoose = require("mongoose");
const app = require('./app');
const Listing = require('./models/Listing');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => { console.log("MongoDB connected");
try {
  // ensure index exists (harmless if it already exists)
  await Listing.collection.createIndex({ createdAt: -1 });
  console.log('Ensured index on Listing.createdAt');
} catch (err) {
  console.warn('Could not create Listing.createdAt index:', err.message);
}
})
.catch((err) => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
