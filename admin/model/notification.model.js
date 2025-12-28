import mongoose from "mongoose";
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  image: {
    type: String,
  },
  type: {
    type: String,
    enum: [
      "order_update",
      "price_drop",
      "review_reply",
      "wishlist_back_in_stock",
      "promotion",
      "system"
    ],
    required: true,
    index: true
  },

  title: String,
  message: String,

  data: {
    type: Schema.Types.Mixed // orderId, productId etc
  },

  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  channel: {
    type: String,
    enum: ["in_app", "push", "email"],
    default: "in_app"
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// common inbox query
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", NotificationSchema);
