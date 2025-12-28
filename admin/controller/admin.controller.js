import express from "express";
import Review from "../model/review.model.js";

// ===================================================
// After cheacking need to add middleware admin
// ===================================================
// import { authAdminMiddleware } from "../middlewares/auth.middleware.js"; // assume this checks admin role


const router = express.Router();


// Approve a review
router.post("/admin/reviews/:id/approve", /**authAdminMiddleware,*/ async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: "Review not found" });


        review.status = "approved";
        await review.save();


        await Review.recalculateProductRating(review.product);
        res.json({ approved: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to approve review" });
    }
});


// Reject a review
router.post("/admin/reviews/:id/reject", /**authAdminMiddleware,*/ async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: "Review not found" });
        review.status = "rejected";
        await review.save();
        await Review.recalculateProductRating(review.product);
        res.json({ rejected: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to reject review" });
    }
});


export default router;