import mongoose from "mongoose";
const { Schema } = mongoose;

const AuditLogSchema = new Schema({
  actor: {
    type: Schema.Types.ObjectId,
    ref: "User",
    index: true
  },

  actorRole: {
    type: String,
    enum: ["customer", "seller", "admin", "system"],
    index: true
  },

  action: {
    type: String,
    required: true,
    index: true
  },

  entityType: {
    type: String,
    enum: [
      "user",
      "product",
      "order",
      "review",
      "payment",
      "inventory",
      "seller"
    ],
    index: true
  },

  entityId: {
    type: Schema.Types.ObjectId,
    index: true
  },

  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,

  ipAddress: String,
  userAgent: String,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.model("AuditLog", AuditLogSchema);




// ===================================================

// AUDIT-LOG USECASE 

/** 
AuditLog ek append-only record hota hai jo system mein hone wali important actions ka tamám trace rakhta hai. Real uses:

Compliance / Legal — kisne kab aur kya change kiya (price change, order refund, seller verification) — company ko proof chahiye hota hai.

Security / Forensics — agar koi fraud ya suspicious activity hui → trace karna (IP, userAgent, what changed).

Rollback / Debugging — koi galat update ho gaya → audit logs se before state milta hai, help karta rollback plan banane mein.

Accountability / Audit trail — admin actions, moderator changes, manual overrides sab track karne ke liye.

Analytics / Reporting — admin workflow metrics (average time to resolve), audit reports for regulators.

Practical example: admin ne kisi product ka price 1000 → 900 update kiya. AuditLog record rahega {actor: adminId, action: "update_price", entityType: "product", entityId: pid, before:{price:1000}, after:{price:900}, ip, createdAt} — agar koi aage dispute kare toh proof mil jayega.

Best practice: sensitive fields ko redact/encrypt, retention policy set karo (e.g., 3–7 saal for compliance), aur logs immutable raho.   */
// ===================================================