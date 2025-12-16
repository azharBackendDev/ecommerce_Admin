import {Category}  from "../model/category.model.js";

/**
 * Public: list categories (optional)
 */
export async function listCategories(req, res) {
  try {
    const q = {};
    // optional: support ?parent=... to list subcategories
    if (req.query.parent) q.parent = req.query.parent;
    const cats = await find(q).sort({ name: 1 }).lean();
    return res.json(cats);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * Public: get single category with merged attributeSchema
 */
export async function getCategory(req, res) {
  try {
    const cat = await Category.findById(req.params.id).lean();
    if (!cat) return res.status(404).json({ error: "Category not found" });

    // prefer using merged schema if helper exists (handles parent inheritance)
    let attributeSchema = cat.attributeSchema || [];
    if (typeof Category.getMergedAttributeSchema === "function") {
      attributeSchema = await Category.getMergedAttributeSchema(cat._id);
    }

    return res.json({ ...cat, attributeSchema });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * Admin: create category
 * body: { name, slug?, parent?, attributeSchema?, metadata? }
 */
export async function createCategory(req, res) {
  try {
    const { name, slug, parent, attributeSchema, metadata } = req.body;
    const cat = new Category({ name, slug, parent: parent || null, attributeSchema: attributeSchema || [], metadata: metadata || {} });
    await cat.save();
    return res.status(201).json(cat);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || "Unable to create category" });
  }
}

/**
 * Admin: update category basic fields (name, slug, parent, metadata)
 */
export async function updateCategory(req, res) {
  try {
    const updates = {};
    const allowed = ["name", "slug", "parent", "metadata"];
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

    const cat = await findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean();
    if (!cat) return res.status(404).json({ error: "Category not found" });
    return res.json(cat);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || "Unable to update" });
  }
}

/**
 * Admin: replace full attributeSchema (overwrite)
 * body: { attributeSchema: [ { key, label, type, required, options, ui } ] }
 */
export async function replaceAttributeSchema(req, res) {
  try {
    const { attributeSchema } = req.body;
    if (!Array.isArray(attributeSchema)) return res.status(400).json({ error: "attributeSchema must be an array" });

    const cat = await findById(req.params.id);
    if (!cat) return res.status(404).json({ error: "Category not found" });

    cat.attributeSchema = attributeSchema;
    await cat.save();
    return res.json(cat);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || "Unable to replace schema" });
  }
}

/**
 * Admin: add single attribute def (append)
 * body: { key, label?, type?, required?, options?, ui? }
 */
export async function addAttribute(req, res) {
  try {
    const def = req.body;
    if (!def || !def.key) return res.status(400).json({ error: "Attribute 'key' is required" });

    // const cat = await   findById(req.params.id);
  const cat =  await Category.findById(req.params.id)
    if (!cat) return res.status(404).json({ error: "Category not found" });

    if ((cat.attributeSchema || []).some(a => a.key === def.key)) {
      return res.status(400).json({ error: "Attribute key already exists" });
    }

    cat.attributeSchema.push(def);
    await cat.save();
    return res.json(cat);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || "Unable to add attribute" });
  }
}

/**
 * Admin: update a single attribute by key (partial update)
 * body: any subset of attribute fields (label, type, required, options, ui)
 */
export async function updateAttribute(req, res) {
  try {
    const key = req.params.key;
    const patch = req.body;
    const cat = await findById(req.params.id);
    if (!cat) return res.status(404).json({ error: "Category not found" });

    const idx = (cat.attributeSchema || []).findIndex(a => a.key === key);
    if (idx === -1) return res.status(404).json({ error: "Attribute key not found" });

    // update only provided fields
    cat.attributeSchema[idx] = { ...cat.attributeSchema[idx].toObject ? cat.attributeSchema[idx].toObject() : cat.attributeSchema[idx], ...patch };
    await cat.save();
    return res.json(cat);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || "Unable to update attribute" });
  }
}

/**
 * Admin: remove attribute by key
 */
export async function removeAttribute(req, res) {
  try {
    const key = req.params.key;
    const cat = await findById(req.params.id);
    if (!cat) return res.status(404).json({ error: "Category not found" });

    cat.attributeSchema = (cat.attributeSchema || []).filter(a => a.key !== key);
    await cat.save();
    return res.json(cat);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || "Unable to remove attribute" });
  }
}
