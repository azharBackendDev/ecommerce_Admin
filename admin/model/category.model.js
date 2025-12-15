import { Schema, model } from "mongoose";

const CategorySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true
        },
        parent: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            default: null
        },
        metadata: {
            type: Object,
            default: {}
        },
    },
    { 
        timestamps: true 
    },
);

module.exports = model('Category', CategorySchema);