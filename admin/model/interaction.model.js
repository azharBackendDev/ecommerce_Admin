import mongoose from "mongoose";
const { Schema } = mongoose;


const InteractionSchema = new Schema(
{
user: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true }, // can be null for anonymous
product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
type: {
type: String,
required: true,
enum: [
"view",
"like",
"remove_like",
"wishlist_add",
"wishlist_remove",
"add_to_cart",
"remove_from_cart",
"purchase",
"review",
],
index: true,
},
variant: { type: Schema.Types.Mixed }, // size/color/sku etc
quantity: { type: Number, default: 1 },
metadata: { type: Schema.Types.Mixed }, // sessionId, ip, referrer, campaign, priceAtTime etc.
createdAt: { type: Date, default: Date.now, index: true },
},
{ timestamps: false }
);


// common index patterns for analytic queries
InteractionSchema.index({ product: 1, type: 1, createdAt: -1 });
InteractionSchema.index({ user: 1, createdAt: -1 });


const Interaction = mongoose.model("Interaction", InteractionSchema);
export default Interaction;