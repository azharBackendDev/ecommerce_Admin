import mongoose from "mongoose";
const { Schema } = mongoose;


const ReviewSchema = new Schema(
{
user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
order: { type: Schema.Types.ObjectId, ref: "Order", required: false }, // optional link to order if you want verified-buyers


rating: { type: Number, required: true, min: 1, max: 5, index: true },
title: { type: String, default: "" },
body: { type: String, default: "" },


// images stored as array of S3 keys or urls. Limit to 5 by validator.
images: {
type: [{ type: String }],
validate: {
validator: (v) => Array.isArray(v) && v.length <= 5,
message: "At most 5 images are allowed",
},
},


// engagement / moderation
helpfulCount: { type: Number, default: 0, index: true },
reported: { type: Boolean, default: false },
reportCount: { type: Number, default: 0 },
status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },


createdAt: { type: Date, default: Date.now },
updatedAt: { type: Date, default: Date.now },
},
{ timestamps: false }
);


// One review per user per product (typical). Remove unique constraint if you allow multiple reviews.
ReviewSchema.index({ user: 1, product: 1 }, { unique: true });


// When a review is created/updated, we may want to update product aggregates.
// This helper recalculates average rating and reviewCount for the product.
ReviewSchema.statics.recalculateProductRating = async function (productId) {
const agg = await this.aggregate([
{ $match: { product: mongoose.Types.ObjectId(productId), status: "approved" } },
{ $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
]);
const result = agg[0] || { avgRating: 0, count: 0 };


// update product doc (assumes Product model has ratingAvg, reviewCount fields)
await mongoose.model("Product").updateOne(
{ _id: productId },
{ $set: { ratingAvg: Number(result.avgRating || 0), reviewCount: result.count } }
);
};


const Review = mongoose.model("Review", ReviewSchema);
export default Review;