// models/Category.js
import mongoose from"mongoose";
const { Schema } = mongoose;

/**
 * Simple slugify (no external deps)
 */
function slugify(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Attribute definition sub-schema
 * key: canonical attribute key used in product.attributes
 * type: string | number | boolean | enum | array | object | date
 * required: whether product must provide this key
 * options: for enum/select values
 */
const AttributeDefSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, default: "" },
    type: {
      type: String,
      enum: ["string", "number", "boolean", "enum", "array", "object", "date"],
      default: "string",
    },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    unit: { type: String, default: "" },
    ui: {
      inputType: { type: String, default: "text" }, // text, number, select, checkbox, textarea
      placeholder: { type: String, default: "" },
    },
  },
  { _id: false }
);

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null }, // hierarchy
    // legacy simple required keys (kept for compatibility)
    requiredAttributes: { type: [String], default: [] },
    // structured defs for dynamic form & validation
    attributeSchema: { type: [AttributeDefSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// indexes for queries
CategorySchema.index({ parent: 1 });
CategorySchema.index({ slug: 1 });

// auto-generate slug if not provided
CategorySchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

/**
 * Static: getMergedAttributeSchema(categoryId)
 * Walks up parent chain and merges attributeSchema arrays.
 * Child overrides parent by key.
 * Returns array of defs (order: ancestor -> child, but child defs override).
 */
CategorySchema.statics.getMergedAttributeSchema = async function (categoryId) {
  const Category = this;
  const defsByKey = new Map();

  // walk up to root and collect nodes in root-first order
  const chain = [];
  let cur = await Category.findById(categoryId).lean();
  while (cur) {
    chain.unshift(cur); // unshift so root is first
    if (!cur.parent) break;
    cur = await Category.findById(cur.parent).lean();
  }

  // merge: ancestor first, child overrides same key
  for (const node of chain) {
    const arr = node.attributeSchema || [];
    for (const def of arr) {
      defsByKey.set(def.key, { ...def });
    }
  }

  return Array.from(defsByKey.values());
};

/**
 * Instance: getFullPath()
 * Returns array of { _id, name, slug } from root -> this
 */
CategorySchema.methods.getFullPath = async function () {
  const Category = this.constructor;
  const path = [];
  let cur = await Category.findById(this._id).lean();
  while (cur) {
    path.unshift({ _id: cur._id, name: cur.name, slug: cur.slug });
    if (!cur.parent) break;
    cur = await Category.findById(cur.parent).lean();
  }
  return path;
};
export const Category = mongoose.model("Category", CategorySchema);
