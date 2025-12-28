
const affiliateLinkSchema = new mongoose.Schema({
    
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    code: { type: String, unique: true },
    commissionRate: Number,
    status: { type: String, enum: ["active", "disabled"], default: "active" }
}, { timestamps: true });

export default mongoose.model("AffiliateLink", affiliateLinkSchema);
