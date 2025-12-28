import mongoose from "mongoose";
const { Schema } = mongoose;

const ModerationSchema = new Schema({
    reporter: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },

    targetType: {
        type: String,
        enum: ["review", "product", "user", "seller"],
        required: true,
        index: true
    },

    targetId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },

    reason: {
        type: String,
        enum: [
            "spam",
            "fake",
            "abuse",
            "copyright",
            "illegal",
            "other"
        ],
        required: true
    },

    description: String,

    status: {
        type: String,
        enum: ["open", "in_review", "resolved", "dismissed"],
        default: "open",
        index: true
    },

    moderator: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },

    resolutionNote: String,

    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    resolvedAt: Date
});

// prevent report spam by same user
ModerationSchema.index(
    { reporter: 1, targetType: 1, targetId: 1 },
    { unique: true }
);

export default mongoose.model("Moderation", ModerationSchema);



// ===================================================
/**
 * Moderation — real use & workflow

Moderation handles reports / content safety. Use cases:

Users report reviews/products/sellers for spam, abuse, copyright.

Auto rules: e.g., if a review gets >N reports, auto hide and create moderation task.

Human moderator reviews reported items, marks resolved/dismissed, takes actions (ban user/remove product).

Track moderator decisions, appeals, and resolution notes.

Typical workflow:

User reports → create Moderation doc (status: open).

Auto checks (spam detection, similarity to previous reports).

Route to moderator queue (in admin UI).

Moderator resolves → update Moderation with moderator, resolvedAt, resolutionNote.

Emit events (e.g., REVIEW_HIDDEN, USER_SUSPENDED) and create AuditLog entry for moderator action.

Best practice: keep moderation decoupled so you can plug ML spam detectors or outsourcing later.
 */
// ===================================================