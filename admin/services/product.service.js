import mongoose from "mongoose";
import Like from "../";
import Interaction from "../models/Interaction.js";
import Review from "../models/Review.js";
import Product from "../models/Product.js"; // ensure this path matches your project


export async function toggleLike(userId, productId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const existing = await Like.findOne({ user: userId, product: productId }).session(session);
        if (existing) {
            await Like.deleteOne({ _id: existing._id }).session(session);
            await Product.updateOne({ _id: productId }, { $inc: { likesCount: -1 } }).session(session);
            await Interaction.create([{ user: userId, product: productId, type: "remove_like" }], { session });
            await session.commitTransaction();
            session.endSession();
            return { liked: false };
        } else {
            await Like.create([{ user: userId, product: productId }], { session });
            await Product.updateOne({ _id: productId }, { $inc: { likesCount: 1 } }).session(session);
            await Interaction.create([{ user: userId, product: productId, type: "like" }], { session });
            await session.commitTransaction();
            session.endSession();
            return { liked: true };
        }
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
}


export async function createOrUpdateReview({ userId, productId, rating, title, body, images = [], status = "pending" }) {
    const existing = await Review.findOne({ user: userId, product: productId });
    if (existing) {
        existing.rating = rating;
        existing.title = title;
        existing.body = body;
        existing.images = images.slice(0, 5);
        existing.status = status;
        existing.updatedAt = new Date();
        await existing.save();
    } else {
        await Review.create({ user: userId, product: productId, rating, title, body, images: images.slice(0, 5), status });
    }


    await Interaction.create({ user: userId, product: productId, type: "review", metadata: { rating } });


    if (status === "approved") {
        await Review.recalculateProductRating(productId);
    }


    return { ok: true };
}