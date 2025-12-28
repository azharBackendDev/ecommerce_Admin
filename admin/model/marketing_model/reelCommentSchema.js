
const reelCommentSchema = new mongoose.Schema({
    
    reelId: { type: mongoose.Schema.Types.ObjectId, ref: "Reel" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: "ReelComment" },
    comment: String,
    status: { type: String, enum: ["visible", "hidden"], default: "visible" }
}, { timestamps: true });

export default mongoose.model("ReelComment", reelCommentSchema);
