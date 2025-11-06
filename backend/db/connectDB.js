const mongoose = require("mongoose");

// MongoDB Atlas URL (replace with your credentials if using Atlas)


// Use either Atlas or Local based on environment
const MONGO_URL = process.env.MONGO_URL ;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ Database connection successful");
    } catch (error) {
        console.error("❌ Database connection error:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;   // ❌ You wrote `module. Exports` (wrong), fixed here ✅
