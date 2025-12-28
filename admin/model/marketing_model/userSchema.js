const userSchema = new mongoose.Schema({
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },

    email: { type: String, unique: true, index: true },
    username: { type: String, unique: true, index: true },
    displayName: String,
    avatar: String,
    bio: String,
    tags: [String],

    rating: { type: Number, default: 0 },
    profileRank: { type: Number, default: 0 },

    totalFollowers: { type: Number, default: 0 },
    totalFollowing: { type: Number, default: 0 },

    totalReels: { type: Number, default: 0 },
    totalReelViews: { type: Number, default: 0 },

    ordersCount: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    cancelRate: { type: Number, default: 0 },

    canUploadReels: { type: Boolean, default: false },
    affiliateEnabled: { type: Boolean, default: false },

    kycStatus: { type: String, enum: ["none", "pending", "verified"], default: "none" },

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
