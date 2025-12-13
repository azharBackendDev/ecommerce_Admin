import mongoose from "mongoose";

export const connectMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.MONGO_DB_NAME,
        })
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection Error ", error.message);
        process.exit(1);
    }
}
