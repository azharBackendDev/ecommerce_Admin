
const reportSchema = new mongoose.Schema({
    
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    targetType: { type: String, enum: ["reel", "user", "comment"] },
    targetId: mongoose.Schema.Types.ObjectId,
    reason: String,
    status: { type: String, enum: ["open", "resolved"], default: "open" }
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);
