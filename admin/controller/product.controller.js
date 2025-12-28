import Product from "../model/product.model.js";
import { Category } from "../model/category.model.js";
import slugify from "slugify";
import { safeParseJSON } from "../utils/parse.util.js";
import { deleteS3Objects } from "../utils/s3Delete.js";
import { s3 } from "../config/s3.js";





export const createProduct = async (req, res) => {
  const uploadedKeys = [];
  try {
    const {
      name,
      description,
      price,
      brand,
      category,
      stock = 0,
      attributes,
      variants,
      tags,
      images, // array of s3 keys OR full URLs (used for presigned flow)
      isActive = true,
      slug: providedSlug
    } = req.body;

    if (!name) return res.status(400).json({ error: "Name is required" });

    // parse json-like fields
    let parsedAttributes = {};
    let parsedVariants = [];
    let parsedTags = [];

    try {
      parsedAttributes = safeParseJSON(attributes) || {};
      parsedVariants = safeParseJSON(variants) || [];
      parsedTags = typeof tags === "string" ? tags.split(",").map(t => t.trim()).filter(Boolean) : tags || [];
    } catch (parseErr) {
      return res.status(400).json({ error: parseErr.message });
    }

    // category validation
    if (category) {
      const cat = await Category.findById(category).lean();
      if (!cat) return res.status(400).json({ error: "Invalid category ID" });
    }


    // ===================================================
    // TWO possible flows:
    // A) Server-upload via multer-s3 -> req.files exists
    // B) Presigned client-upload -> req.body.images contains keys or full URLs
    // ===================================================
    let s3Keys = [];
    let imageUrls = [];

    // ===================================================
    // A) Check multer-s3 files first (server upload flow)
    // ===================================================
    const files = req.files || [];
    if (files.length > 0) {
      // ===================================================
      // collect keys and public/private location handling
      // ===================================================
      for (const f of files) {
        // ===================================================
        // multer-s3 typically provides key (Key) and location
        // multer-s3 sets f.key and f.location
        // ===================================================

        if (f.key) s3Keys.push(f.key);
        if (f.location) imageUrls.push(f.location);
      }
    } else {
      // B) presigned flow: expect images array from body
      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "At least one image/video required" });
      }

      // convert images entries -> keys
      for (const img of images) {
        if (typeof img !== "string") return res.status(400).json({ error: "Invalid image format" });
        if (img.startsWith("http")) {
          try {
            const url = new URL(img);
            const key = url.pathname.replace(/^\//, "");
            s3Keys.push(key);
            // optionally reconstruct public URL (or use CDN later)
            imageUrls.push(`https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`);
          } catch (e) {
            return res.status(400).json({ error: "Invalid image URL" });
          }
        } else {
          s3Keys.push(img);
          imageUrls.push(`https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${img}`);
        }
      }


    }

    // slug
    const slug = providedSlug || slugify(name, { lower: true, strict: true });

    const product = new Product({
      name,
      slug,
      description,
      price: Number(price),
      brand,
      category,
      images: imageUrls,
      s3Keys,
      stock: Number(stock),
      attributes: parsedAttributes,
      variants: parsedVariants,
      tags: parsedTags,
      isActive: (isActive === "false" || isActive === false) ? false : true,
    });

    await product.save();

    const populated = await Product.findById(product._id)
      .select("-__v")
      .populate("category", "name slug")
      .lean();

    return res.status(201).json(populated);
  } catch (err) {
    console.error("Create product error", err);

    // cleanup server-uploaded keys if any (uploadedKeys)
    if (uploadedKeys.length > 0) {
      try {
        await deleteS3Objects(uploadedKeys);
      } catch (error) {
        console.error("s3 cleanup failed Error:", error);
      }
    }

    if (err.name === "ValidationError" || err.status === 400) {
      return res.status(400).json({ error: err.message || "Validation failed" });
    }
    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      return res.status(409).json({ error: "Slug already exists, please retry" });
    }

    return res.status(500).json({ error: "Unable to create product" });
  }
};


// ===================================================
// 🌐 PAGE BASED PAGINATION best for small data not for large data in the api key 
// 🧮MongoDB ko kya karna padta hai?
// 1️⃣ Pehle 9,980 records read
// 2️⃣ Phir unko discard (skip)
// 3️⃣ Phir next 20 return
// ===================================================

export async function getProducts(req, res) {
  try {

    //✔ Safe pagination 
    const page = Math.max(1, Number(req.query.page) || 1);

    //Ek page mein kitne items honge define - Agar user limit=10000 bhej de → DB crash ho sakta hai
    const limit = Math.min(100, Number(req.query.limit) || 20); //⚠️ performance protection


    // ye formula ye btata hai ki next page par konse index se product get karna hai 
    // eg:- first skip value 0 becuase page vlaue 1 - 1 = 0 to 0 product skip and show product from 0 to limit=20 and then user click page 2 first 20 product skip and Show products 21 se 40 becuase page 2 - 1 = 1 * 20 = 20 so skip product automtiaclly 20 and start form 21 
    const skip = (page - 1) * limit;

    const q = {};

    if (req.query.category) q.category = req.query.category;

    //nike, Nike, NIKE sab match honge
    if (req.query.brand) q.brand = new RegExp(req.query.brand, 'i');

    // $gte = greater than or equal
    if (req.query.minPrice) q.price = { ...(q.price || {}), $gte: Number(req.query.minPrice) };

    // $lte = less than or equal
    if (req.query.maxPrice) q.price = { ...(q.price || {}), $lte: Number(req.query.maxPrice) };

    // create text index on name/description
    if (req.query.q) q.$text = { $search: req.query.q };

    const [items, total] = await Promise.all([
      Product.find(q).populate('category', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(q),
    ]);
    return res.json({ page, limit, total, items });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}



// ===================================================
// 🧩 Cusor based pagination best for scalable
// ===================================================

export async function getProductsCursor(req, res) {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const cursor = req.query.cursor;

    const query = {};

    // 🔹 Cursor logic
    if (cursor) {
      query._id = { $lt: cursor };
    }

    // 🔹 Fetch products
    const items = await Product.find(query)
      .sort({ _id: -1 })   // latest first
      .limit(limit + 1)    // extra one to check "hasMore"
      .lean();

    // 🔹 Check if more data exists
    let nextCursor = null;
    let hasMore = false;

    if (items.length > limit) {
      hasMore = true;
      const lastItem = items.pop(); // extra item remove
      nextCursor = lastItem._id;
    }

    return res.json({
      items,
      nextCursor,
      hasMore
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
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



// ===================================================
//  Admin: update product (partial, no image handling here - for re-upload, 
// use separate endpoint or full replace)
// Does not handle image updates; use a separate route if needed
// ===================================================

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


// Admin: delete product 
export async function deleteProduct(req, res) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    if (product.s3Keys && product.s3Keys.length > 0) {
      try {
        await deleteS3Objects(product.s3Keys);
      } catch (error) {
        console.error('When we were deleting the product, the S3 cleanup failed',)
      }
    }

    return res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}