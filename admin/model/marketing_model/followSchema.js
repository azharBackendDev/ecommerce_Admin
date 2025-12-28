
const followSchema = new mongoose.Schema({

    followerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    followingId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export default mongoose.model("Follow", followSchema);
