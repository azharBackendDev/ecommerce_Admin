import mongoose from "mongoose";
const { Schema } = mongoose;

const WishlistSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },

  products: [{
    type: Schema.Types.ObjectId,
    ref: "Product",
    index: true
  }],

  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// fast lookup if product exists in wishlist
WishlistSchema.index({ user: 1, products: 1 });

export default mongoose.model("Wishlist", WishlistSchema);
