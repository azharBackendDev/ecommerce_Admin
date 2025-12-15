import { Schema, model } from 'mongoose';

const ProductSchema = new Schema(
     {
          name: {
               type: String,
               required: true
          },
          slug: {
               type: String,
               required: true,
               index: true
          },
          description: {
               type: String
          },
          price: {
               type: Number,
               required: true,
               index: true
          },
          brand: {
               type: String,
               index: true
          },
          category: {
               type: Schema.Types.ObjectId,
               ref: 'Category',
               required: true,
               index: true
          },
          subCategory: {
               type: Schema.Types.ObjectId,
               ref: 'Category',
               index: true
          },
          images: [
               { type: String }
          ],
          stock: {
               type: Number,
               default: 0
          },
          attributes: {
               type: Object,
               default: {}
          }
     },
     { timestamps: true }
);

module.exports = model('product', ProductSchema);