import "dotenv/config";

import { app } from './app.js';
import { connectMongoDB } from "./config/mongo.js";
import { connectSupabase } from "./config/supabase.js";


const PORT = process.env.PORT || 5000;

const startServer = async () => {
    console.log("Starting server...");

    let mongoConnected = false;
    let supabaseConnected = false;

    // 🔹 CHECK MONGO DB
    if (process.env.USE_MONGO === "true") {
        try {
            await connectMongoDB();
            mongoConnected = true;
        } catch (err) {
            console.error("MongoDB connection failed:", err.message);
        }
    } else {
        console.log("MongoDB is disabled in .env");
    }

    // 🔹 CHECK SUPABASE
    if (process.env.USE_SUPABASE === "true") {
        try {
            connectSupabase();
            supabaseConnected = true;
        } catch (err) {
            console.error("Supabase connection failed:", err.message);
        }
    } else {
        console.log("Supabase is disabled in .env");
    }

    // 🔹 FINAL RESULT MESSAGE
    if (mongoConnected && supabaseConnected) {
        console.log("✅ Both databases are connected successfully!");
    }
    else if (mongoConnected && !supabaseConnected) {
        console.log("⚠️ MongoDB is connected, Supabase is NOT connected.");
    }
    else if (!mongoConnected && supabaseConnected) {
        console.log("⚠️ Supabase is connected, MongoDB is NOT connected.");
    }
    else {
        console.log("❌ ERROR: No database is connected!");
    }

    // 🔹 START SERVER
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
};

startServer();
