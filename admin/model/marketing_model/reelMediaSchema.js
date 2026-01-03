
const reelMediaSchema = new mongoose.Schema({

    reelId: { type: mongoose.Schema.Types.ObjectId, ref: "Reel" },
    videoUrl: String,
    thumbnailUrl: String,
    duration: Number,
    size: Number,
    transcodeStatus: { type: String, enum: ["pending", "done"], default: "pending" }
}, { timestamps: true });

export default mongoose.model("ReelMedia", reelMediaSchema);
