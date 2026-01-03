
const reelPermissionRuleSchema = new mongoose.Schema({
    minRating: Number,
    minProfileRank: Number,
    allowAffiliate: Boolean,
    enabled: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("ReelPermissionRule", reelPermissionRuleSchema);
