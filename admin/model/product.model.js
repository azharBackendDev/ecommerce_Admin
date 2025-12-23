// models/Product.js
import mongoose from "mongoose";
const { Schema } = mongoose;
import { Category } from "./category.model.js";

const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      index: true
    },
    brand: {
      type: String,
      required: true,
      index: true
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    images: {
      type: [{ type: String }],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one image or video is required'
      }
    },
    s3Keys: [{ type: String }],

    stock: { type: Number, default: 0, min: 0 },
    
    // attributes stored as Map (key -> mixed)
    attributes: { type: Map, of: Schema.Types.Mixed, default: {} },
    variants: [
      {
        size: String,
        color: String,
        stock: Number,
        priceAdjustment: Number,
      },
    ],
    tags: [String],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/**
 * Helper: convert attributes (Map or plain obj) to plain object
 */
function normalizeAttributes(attrs) {
  if (!attrs) return {};
  if (attrs instanceof Map) {
    return Object.fromEntries(attrs);
  }
  if (typeof attrs === "object") {
    return { ...attrs };
  }
  return {};
}

/**
 * Helper: basic type check function
 */
function isTypeValid(def, val) {
  if (val === undefined || val === null || val === "") return true; // presence handled separately
  const t = def.type || "string";
  if (t === "string") return typeof val === "string";
  if (t === "number") return !isNaN(Number(val));
  if (t === "boolean")
    return typeof val === "boolean" || val === "true" || val === "false";
  if (t === "enum")
    return def.options && def.options.length
      ? def.options.includes(String(val))
      : true;
  if (t === "array") return Array.isArray(val);
  if (t === "object") return typeof val === "object" && !Array.isArray(val);
  if (t === "date") return !isNaN(new Date(val).getTime());
  return true;
}

/**
 * Pre-save: validate product.attributes against category.attributeSchema (merged)
 */
ProductSchema.pre("save", async function () {
  // only validate when creating or when category/attributes changed
  if (
    !this.isNew &&
    !this.isModified("category") &&
    !this.isModified("attributes")
  ) {
    return;
  }

  const cat = await Category.findById(this.category).lean();
  if (!cat) {
    const err = new Error("Invalid category");
    err.status = 400;
    throw err;
  }

  const defs =
    typeof Category.getMergedAttributeSchema === "function"
      ? await Category.getMergedAttributeSchema(this.category)
      : cat.attributeSchema || [];

  const attrs = normalizeAttributes(this.attributes);

  for (const def of defs) {
    const key = def.key;
    const val = attrs[key];

    // required check
    if (def.required && (val === undefined || val === null || val === "")) {
      const err = new Error(`Missing required attribute: ${key}`);
      err.status = 400;
      throw err;
    }

    // type check
    if (val !== undefined && val !== null && val !== "") {
      if (!isTypeValid(def, val)) {
        const err = new Error(
          `Invalid value for ${key}: expected ${def.type}`
        );
        err.status = 400;
        throw err;
      }

      // enum check
      if (
        (def.type === "enum" || def.options?.length) &&
        def.options?.length &&
        !def.options.includes(String(val))
      ) {
        const err = new Error(
          `${key} must be one of: ${def.options.join(", ")}`
        );
        err.status = 400;
        throw err;
      }
    }
  }
});


const Product = mongoose.model("Product", ProductSchema);

export default Product;
