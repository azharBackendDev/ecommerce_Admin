import express from "express";
import Product from "../model/product.model.js";
import Interaction from "../model/interaction.model.js";


const router = express.Router();


// Top liked products (fast using denormalized counter)
router.get("/analytics/top-liked", async (req, res) => {
    try {
        const top = await Product.find({ isActive: true }).sort({ likesCount: -1 }).limit(20).select("name price likesCount");
        res.json(top);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to get top liked" });
    }
});


// Trending by interactions in last N days
router.get("/analytics/trending", async (req, res) => {
    try {
        const days = Number(req.query.days) || 7;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);


        const agg = await Interaction.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: "$product", score: { $sum: 1 } } },
            { $sort: { score: -1 } },
            { $limit: 20 },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $project: { product: { name: 1, price: 1, likesCount: 1 }, score: 1 } },
        ]);


        res.json(agg);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to compute trending" });
    }
});


// Rating histogram for a product
router.get("/analytics/product/:id/ratings", async (req, res) => {
    try {
        const productId = req.params.id;
        const agg = await Interaction.aggregate([
            { $match: { product: mongoose.Types.ObjectId(productId), type: "review" } },
            { $group: { _id: "$metadata.rating", count: { $sum: 1 } } },
        ]);
        res.json(agg);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to get rating histogram" });
    }
});


export default router;