
const reelLikeSchema = new mongoose.Schema({

    reelId: { type: mongoose.Schema.Types.ObjectId, ref: "Reel" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

reelLikeSchema.index({ reelId: 1, userId: 1 }, { unique: true });

export default mongoose.model("ReelLike", reelLikeSchema);
