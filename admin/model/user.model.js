import mongoose from "mongoose";
const { Schema } = mongoose;


const AddressSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  fullName: String,
  phone: String,
  addressLine1: String,
  addressLine2: String,
  city: String,
  state: String,
  pincode: String,
  country: String,
  isDefault: { type: Boolean, default: false }
}, { _id: false }); // Embedded for tight coupling – no need for separate model unless independent queries

const SellerInfoSchema = new Schema({
  shopName: String,
  gstNumber: String,
  panNumber: String,
  isVerifiedSeller: { type: Boolean, default: false },
  rating: { type: Number, default: 0 }
}, { _id: false }); // Embedded – seller info is user-specific, not reusable across users

const UserSchema = new Schema({
  role: { type: String, enum: ["customer", "seller", "admin"], default: "customer", index: true },

  fullName: String,
  email: { type: String, index: true, sparse: true, unique: true }, // sparse for optional unique
  phone: { type: String, index: true, sparse: true, unique: true }, // same for phone
  whatsappnumber: String,
  profileImage: String,

  // Verification status (updated after OTP verify)
  verified: { type: Boolean, default: false },
  verifiedAt: Date, // timestamp when verified

  // Recovery fields (updated after add recovery flow)
  recoveryEmail: { type: String, sparse: true, unique: true },
  recoveryPhone: { type: String, sparse: true, unique: true },
  recoveryVerifiedAt: Date,

  status: { type: String, enum: ["active", "blocked", "deleted"], default: "active" },
  addresses: [AddressSchema],
  sellerInfo: SellerInfoSchema
}, { timestamps: true });

// Compound index for login lookups
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });

// No pre-save for OTP – handled in separate Otp model

const Users = mongoose.model("User", UserSchema);
export default Users;