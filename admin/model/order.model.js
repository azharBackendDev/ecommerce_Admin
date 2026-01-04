// models/Order.js (No changes needed – well-structured)
import mongoose from "mongoose";
const { Schema, model } = mongoose;

const OrderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  // ===================================================
  // snapshot fields (store the state at time of order)
  // ===================================================
  name: { type: String, required: true },
  slug: String,
  image: String,
  sku: String, // FIXED: Now populated from Product.sku
  unitPrice: { type: Number, required: true }, // product.price + variant adjustment
  quantity: { type: Number, required: true, min: 1 },

  // ===================================================
  // optional: store variant selection (size/color/id)
  // ===================================================
  variant: {
    variantId: Schema.Types.ObjectId, // FIXED: Changed to ObjectId (was Mixed; more precise for subdoc _id)
    size: String,
    color: String,
    priceAdjustment: Number
  },

  lineTotal: { type: Number, required: true } // unitPrice * quantity (after discounts if any)

}, { _id: false });



// Address Schemaa
const AddressSnapshotSchema = new Schema({
  fullName: String,
  phone: String,
  addressLine1: String,
  addressLine2: String,
  city: String,
  state: String,
  pincode: String,
  country: String
}, { _id: false });


// Payment info Schema
const PaymentInfoSchema = new Schema({
  method: { type: String, enum: ["cod", "card", "wallet", "upi", "netbanking", "other"], default: "cod" },
  transactionId: String,
  status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
  paidAt: Date
}, { _id: false });



const OrderSchema = new Schema({

  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  }, // e.g. ORD-20251226-0001

  customer: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  items: {
    type: [OrderItemSchema],
    required: true
  },
  shippingAddress: AddressSnapshotSchema, // snapshot
  billingAddress: AddressSnapshotSchema,  // optionally separate
  subTotal: {
    type: Number,
    required: true
  },   // sum of lineTotals before taxes, shipping, discounts
  discount: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  }, // final payable
  payment: PaymentInfoSchema,
  status: {
    type: String,
    enum: ["created", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"],
    default: "created",
    index: true
  },
  seller: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false
  }, // optional single-seller marketplace

  meta: {
    type: Schema.Types.Mixed
  }, // any additional info

  // optional fields for audit
  placedAt: { type: Date, default: Date.now },

  // for IVR call detection
  ivrNextAt: { type: Date, default: null, index: true },   // next scheduled IVR time
  ivrLatestCall: { type: Schema.Types.ObjectId, ref: 'IVRCall', default: null },
  ivrCallDone: { type: Boolean, default: false }, // optional quick flag
  callLogs: { type: [{ type: Schema.Types.Mixed }], default: [] },
  exotelCallSid: { type: String },

  deliveredAt: Date,
  cancelledAt: Date
}, { timestamps: true });

// indexes for quick queries
OrderSchema.index({ customer: 1, status: 1, createdAt: -1 });

export default model("Order", OrderSchema);