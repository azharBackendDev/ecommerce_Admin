
const affiliateEarningSchema = new mongoose.Schema({
    
    affiliateLinkId: { type: mongoose.Schema.Types.ObjectId, ref: "AffiliateLink" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    amount: Number,
    status: { type: String, enum: ["pending", "paid", "rejected"], default: "pending" }
}, { timestamps: true });

export default mongoose.model("AffiliateEarning", affiliateEarningSchema);
