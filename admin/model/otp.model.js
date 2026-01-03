import mongoose from "mongoose";
const { Schema, model } = mongoose;

const OtpSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    index: true 
  },
  code: { 
    type: String, 
    required: true, // e.g., "123456" – hash in controller for security (bcrypt)
    minlength: 4,
    maxlength: 6
  },
  type: { 
    type: String, 
    enum: ["email", "phone", "recovery_email", "recovery_phone"], 
    required: true, // specific for channel
    index: true 
  },
  channel: { 
    type: String, 
    required: true, // e.g., email/phone used for send
    index: true 
  },
  purpose: { 
    type: String, 
    enum: ["register", "login", "verify", "recovery", "reset"], 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expires: "0" } // TTL index: Auto-delete after expiry (e.g., 10 min) – scales well
  },
  attempts: { type: Number, default: 0 }, // track failed attempts
  maxAttempts: { type: Number, default: 5 },
  sentAt: { type: Date, default: Date.now },
  verifiedAt: Date, // set on successful verify
  ipAddress: String, // for rate limiting/fraud
  userAgent: String
}, { 
  timestamps: true 
});

// Compound index for quick lookups: user + type + purpose (prevent spam)
OtpSchema.index({ userId: 1, type: 1, purpose: 1, createdAt: -1 });

// Pre-save: Optional hash code (implement in controller for flexibility)
OtpSchema.pre("save", async function () {
  if (this.isModified("code")) {
    // TODO: this.code = await bcrypt.hash(this.code, 10); // Secure hashing
  }
});

export default model("Otp", OtpSchema);