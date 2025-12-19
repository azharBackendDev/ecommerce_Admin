import Product from "../model/product.model.js";
import { Category } from "../model/category.model.js";
import slugify from "slugify"; // Assume slugify is installed; if not, use the simple function from category model





/**
 * Admin: create product
 * Handles multipart form with images uploaded to S3
 * Auto-generates slug if not provided
 * Validates category exists and attributes against merged schema (via model pre-save)
 */

export async function createProduct(req, res) {
  try {
    const { name, description, price, brand, category, attributes, stock = 0, variants, tags, isActive = true } = req.body;

    // Parse JSON fields if they are strings (from form-data)
    let parsedAttributes = attributes ? (typeof attributes === "string" ? JSON.parse(attributes) : attributes) : {};
    let parsedVariants = variants ? (typeof variants === "string" ? JSON.parse(variants) : variants) : [];
    let parsedTags = tags ? (typeof tags === "string" ? tags.split(",") : tags) : [];

    // Validate category exists
    const cat = await Category.findById(category);
    if (!cat) return res.status(400).json({ error: "Invalid category ID" });

    // Generate slug if not provided
    const slug = req.body.slug || slugify(name, { lower: true });

    // Collect image URLs from S3 uploads
    const imageUrls = req.files ? req.files.map(file => file.location) : [];
    if (imageUrls.length === 0) return res.status(400).json({ error: "At least one image is required" });

    const product = new Product({
      name,
      slug,
      description,
      price: Number(price),
      brand,
      category,
      images: imageUrls,
      stock: Number(stock),
      attributes: parsedAttributes, // Will be validated in pre-save
      variants: parsedVariants,
      tags: parsedTags,
      isActive,
    });

    await product.save();
    const populated = await Product.findById(product._id).populate("category", "name slug");
    return res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    if (err.name === "ValidationError" || err.status === 400) {
      return res.status(400).json({ error: err.message || "Validation failed" });
    }
    return res.status(500).json({ error: "Unable to create product" });
  }
}


/**
 * Public: list products (optional filters)
 */
export async function getProducts(req, res) {
  try {
    
    // const q = { isActive: false }; // Default to active
    // if (req.query.category) q.category = req.query.category;
    // if (req.query.brand) q.brand = { $regex: req.query.brand, $options: "i" };
    // if (req.query.minPrice) q.price = { ...q.price, $gte: Number(req.query.minPrice) };
    // if (req.query.maxPrice) q.price = { ...q.price, $lte: Number(req.query.maxPrice) };

    const products = await Product.find()
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();
    return res.json(products);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * Public: get single product by ID
 */
export async function getProductById(req, res) {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name slug attributeSchema") // For merged attributes if needed
      .lean();
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json(product);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}


/**
 * Admin: update product (partial, no image handling here - for re-upload, use separate endpoint or full replace)
 * Does not handle image updates; use a separate route if needed
 */
export async function updateProduct(req, res) {
  try {
    const updates = {};
    const allowed = ["name", "description", "price", "brand", "stock", "attributes", "variants", "tags", "isActive"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (k === "price" || k === "stock") {
          updates[k] = Number(req.body[k]);
        } else if (k === "attributes" || k === "variants" || k === "tags") {
          updates[k] = typeof req.body[k] === "string" ? JSON.parse(req.body[k]) : req.body[k];
        } else {
          updates[k] = req.body[k];
        }
      }
    }

    // Handle slug update if name changed
    if (updates.name && !updates.slug) {
      updates.slug = slugify(updates.name, { lower: true });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate("category", "name slug");
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Re-validate attributes if updated (model pre-save handles on save)
    await product.save(); // Triggers pre-save validation

    return res.json(product);
  } catch (err) {
    console.error(err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message || "Validation failed" });
    }
    return res.status(400).json({ error: err.message || "Unable to update" });
  }
}

/**
 * Admin: delete product
 */
export async function deleteProduct(req, res) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}