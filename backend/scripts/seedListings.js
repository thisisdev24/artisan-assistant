// backend/scripts/seedListings.js
const mongoose = require('mongoose');

let fakerPackage;
try {
  // prefer the maintained package
  fakerPackage = require('@faker-js/faker');
} catch (e) {
  try {
    fakerPackage = require('faker'); // fallback if someone installed old faker
  } catch (err) {
    console.error('Faker package not found. Please install @faker-js/faker or faker.');
    process.exit(1);
  }
}

// normalize access to faker object across different versions
// v6/v7/v8 changed namespaces (address/location etc). We'll probe for available APIs.
const faker = fakerPackage.faker || fakerPackage; // in some versions require returns { faker: ... }

function safeCall(obj, chain, ...args) {
  // chain: array of property names to attempt like ['address','city'] or ['location','city']
  try {
    let cur = obj;
    for (const key of chain) {
      if (cur == null) return undefined;
      cur = cur[key];
    }
    if (typeof cur === 'function') return cur(...args);
    return cur; // sometimes it's a value
  } catch (e) {
    return undefined;
  }
}

function getCity() {
  return (
    safeCall(faker, ['address','city']) ||
    safeCall(faker, ['location','city']) ||
    safeCall(faker, ['address','cityName']) ||
    safeCall(faker, ['address','cityName']) ||
    safeCall(faker, ['address','cityName']) ||
    'Unknown City'
  );
}
function getCountry() {
  return (
    safeCall(faker, ['address','country']) ||
    safeCall(faker, ['location','country']) ||
    safeCall(faker, ['address','countryName']) ||
    'Unknown Country'
  );
}
function getMaterial() {
  return (
    safeCall(faker, ['commerce','productMaterial']) ||
    safeCall(faker, ['commerce','material']) ||
    safeCall(faker, ['helpers','arrayElement'], ['wood','cotton','brass','ceramic','leather']) ||
    'mixed'
  );
}
function getColor() {
  return (
    safeCall(faker, ['color','human']) ||
    safeCall(faker, ['color','css']) ||
    safeCall(faker, ['commerce','color']) ||
    safeCall(faker, ['helpers','arrayElement'], ['red','blue','green','natural']) ||
    'varied'
  );
}

const path = require('path');
const Listing = require(path.join(__dirname, '..', 'src', 'models', 'Listing'));

// connection string: use env or fallback to localhost (you already have Atlas URI set)
const MONGO_URI = 'mongodb+srv://imdevkhare_db_user:LYnYoQjsKClK4b28@cluster0.vmp6708.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0' || 'mongodb://localhost:27017/artisan_market';

async function main() {
  console.log('Using faker shape keys:', Object.keys(faker).slice(0,20));
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB:', MONGO_URI);

  // OPTIONAL: clear existing listings
  await Listing.deleteMany({});
  console.log('Cleared existing listings.');

  const items = [];
  const N = 100;
  for (let i = 0; i < N; i++) {
    items.push({
      title: (safeCall(faker, ['commerce','productName']) || safeCall(faker, ['commerce','product']) || `Handmade item ${i+1}`),
      description: (safeCall(faker, ['lorem','sentences']) || safeCall(faker, ['lorem','sentence']) || `Beautiful handmade item.`),
      price: parseFloat(safeCall(faker, ['commerce','price']) || (10 + Math.random() * 200).toFixed(2)),
      category: (safeCall(faker, ['commerce','department']) || safeCall(faker, ['commerce','category']) || 'Handicraft'),
      images: [`https://picsum.photos/seed/${i}/800/600`],
      location: { city: getCity(), country: getCountry() },
      metadata: {
        material: getMaterial(),
        color: getColor(),
      },
      createdAt: new Date()
    });
  }

  const res = await Listing.insertMany(items, { ordered: false });
  console.log(`Inserted ${res.length} listings.`);
  await mongoose.disconnect();
  console.log('Done - disconnected.');
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
