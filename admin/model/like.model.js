import mongoose from "mongoose";
const { Schema } = mongoose;


const LikeSchema = new Schema(
{
user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
createdAt: { type: Date, default: Date.now },
},
{ timestamps: false }
);


// Prevent duplicate likes by same user on same product
LikeSchema.index({ user: 1, product: 1 }, { unique: true });


// Convenience static to check if liked
LikeSchema.statics.isLiked = async function (userId, productId) {
return !!(await this.findOne({ user: userId, product: productId }).lean());
};


const Like = mongoose.model("Like", LikeSchema);
export default Like;