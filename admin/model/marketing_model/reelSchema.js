
const reelSchema = new mongoose.Schema({

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    caption: String,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },

    isSponsored: { type: Boolean, default: false },
    affiliateLinkId: { type: mongoose.Schema.Types.ObjectId, ref: "AffiliateLink" },

    status: {
        type: String,
        enum: ["pending", "published", "blocked", "removed"],
        default: "pending"
    },

    visibility: {
        type: String,
        enum: ["public", "followers", "private"],
        default: "public"
    },

    /**  ===================================================
    LEVEL_1 → sirf apne purchased products ki reels
    LEVEL_2 → website ke kisi bhi product ki reels
    LEVEL_3 → promotion + affiliate + sponsored reels
     =================================================== */
    reelsLevel: {
        type: String,
        enum: ["LEVEL_1", "LEVEL_2", "LEVEL_3"],
        default: "LEVEL_1"
    },


    // Reels ai detection flow 

    detectionStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },


    detectionFlags: {
        nsfw: Boolean,
        violence: Boolean,
        copyright: Boolean,
        watermark: Boolean,
        externalContent: Boolean
    },

    rejectionReason: { type: String },


    viewsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 }

}, { timestamps: true });


export default mongoose.model("Reel", reelSchema);
