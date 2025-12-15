import { Schema, model } from 'mongoose';

const SubCategorySchema = new Schema(
    {
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        slug: {
            type: String,
            required: true,
            lowercase: true
        },
        metadata: {
            type: Object,
            default: {}
        }
    },
    { timestamps: true }
);

module.exports = model('Subcategory', SubCategorySchema);