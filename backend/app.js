const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');

// // TEMP debug — add at top of src/app.js after other requires
// function dump(name, mod) {
//   console.log(`DEBUG: ${name} -> type:`, typeof mod);
//   try { console.log(`${name} keys:`, Object.keys(mod)); } catch(e){}
//   if (mod && mod.default) console.log(`${name}.default -> type:`, typeof mod.default);
// }

// const authMod = require('./routes/auth');
// dump('auth', authMod);

// const listingsMod = require('./routes/listings');
// dump('listings', listingsMod);

// // then later your app.use lines...
// // app.use('/api/auth', authMod);
// // app.use('/api/listings', listingsMod);


// const app = express();
// app.use(cors());
// app.use(express.json());

// const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/artisan_assistant';
// mongoose.connect(MONGO_URI).then(()=> console.log('Mongo connected')).catch(console.error);

// // simple route
// app.get('/', (req, res) => res.send({status: 'ok'}));

// // mount auth & listings routes (create these files)
// const authRoutes = require('./routes/auth');
// app.use('/api/auth', authRoutes);
// app.use('/api/listings', require('./routes/listings'));

// const port = process.env.PORT || 5000;
// app.listen(port, ()=> console.log('Backend running on', port));
