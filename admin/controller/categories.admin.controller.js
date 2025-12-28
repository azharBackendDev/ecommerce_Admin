import { Category } from "../model/category.model.js";

let _cachedTree = null;
let _cachedTreeAt = 0;
const CACHE_TTL_MS = 30 * 1000;

// ===================================================
// yaha par category tree building ka logic likha hai
// ===================================================

function buildCategoryTree(categories) {

    // ===================================================
    //  normalize and init children
    // ===================================================

    const map = new Map();

    for (const c of categories) {
        const id = String(c._id);
        map.set(id, { ...c, _id: id, children: [] });
    }

    const roots = [];
    for (const node of map.values()) {
        if (node.parent) {
            const parentId = String(node.parent);
            const parent = map.get(parentId);

            if (parent) {
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        } else {
            roots.push(node)
        }
    }

    // ===================================================
    // recursive sort by name (optional)
    // ===================================================

    function sortRecursively(arr) {
        arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        for (const n of arr) {
            if (n.children && n.children.length) sortRecursively(n.children);
        }
    }
    sortRecursively(roots);

    return roots;

}




// ===================================================
// 🛠️ get categories tree controller code 
// ===================================================

export async function getCategoriesTree(req, res) {
  try {
    // Serve from cache if fresh
    const now = Date.now();
    if (_cachedTree && now - _cachedTreeAt < CACHE_TTL_MS) {
      return res.json(_cachedTree);
    }

    // Fetch minimal fields for tree; use lean() for performance
    const categories = await Category.find({}, { name: 1, parent: 1, slug: 1 }).lean();

    const tree = buildCategoryTree(categories);

    // store cache
    _cachedTree = tree;
    _cachedTreeAt = Date.now();

    return res.json(tree);
  } catch (err) {
    console.error("getCategoriesTree error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}