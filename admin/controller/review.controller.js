import { Router } from "express";
import { createOrUpdateReview } from "../services/product.service.js";
import Review from "../model/review.model.js";


// ===================================================
// After Cheacking Neet to add auth
// ===================================================
// import { requireAuth } from "../middleware/auth.js"; // assume this exists




const router = Router();

// Submit or update review
router.post("/products/:id/review", /** requireAuth, Middleware */  async (req, res) => {
    try {
        const userId = req.user._id;
        const productId = req.params.id;
        const { rating, title, body, images } = req.body;


        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating 1-5 required" });


        await createOrUpdateReview({ userId, productId, rating, title, body, images, status: "pending" });
        res.json({ message: "Review submitted (pending moderation)" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to submit review" });
    }
});


// Get product reviews (approved only by default)
router.get("/products/:id/reviews", async (req, res) => {
    try {
        const productId = req.params.id;
        const reviews = await Review.find({ product: productId, status: "approved" })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate("user", "name avatar");
        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch reviews" });
    }
});


export default router;