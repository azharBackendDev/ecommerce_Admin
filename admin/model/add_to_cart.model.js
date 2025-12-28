import mongoose from "mongoose";
const { Schema } = mongoose;

const CartItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  sku: { type: Schema.Types.ObjectId, ref: "SKU" }, // optional
  quantity: { type: Number, default: 1 },
  priceAt: { type: Number }, // price snapshot
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const CartSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true, unique: true },
  items: [CartItemSchema],
  updatedAt: { type: Date, default: Date.now, index: true }
});

CartSchema.index({ "user": 1 }, { unique: true });

export default mongoose.model("Cart", CartSchema);
