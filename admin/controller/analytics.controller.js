import { Router } from "express";
import mongoose from "mongoose";
import { Like, Interaction } from "../model/index.model.js";
import Product from "../model/product.model.js";
import User from "../model/user.model.js";
import { toggleLike as toggleLikeService } from "../services/product.service.js";

// ===================================================
// After checking, you can enable auth middleware
// ===================================================
// import { requireAuth } from "../middleware/auth.js";

const router = Router();

/* ===================================================
   LIKE PRODUCT (toggle)
   =================================================== */

router.post("/products/:id/like", /** requireAuth, */ async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: "Login required" });
        }

        const productId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: "Invalid product id" });
        }

        const result = await toggleLikeService(userId, productId);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Failed to toggle like",
            error: err.message,
        });
    }
}
);

/* ===================================================
   PRODUCT VIEW (anonymous allowed)
   =================================================== */
router.post("/products/:id/view", async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.user?._id || null;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: "Invalid product id" });
        }

        await Interaction.create({
            user: userId,
            product: productId,
            type: "view",
            metadata: {
                ip: req.ip,
                userAgent: req.get("User-Agent"),
            },
        });

        // fast counter (ignore failure)
        await Product.updateOne(
            { _id: productId },
            { $inc: { viewCount: 1 } }
        ).catch(() => { });

        res.json({ viewed: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to record view" });
    }
});

/* ===================================================
   WISHLIST TOGGLE (stored in User document)
   =================================================== */
router.post( "/products/:id/wishlist", /**requireAuth*/ async (req, res) => {
        try {
            const userId = req.user?._id;
            if (!userId) {
                return res.status(401).json({ message: "Login required" });
            }

            const productId = req.params.id;

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({ message: "Invalid product id" });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const exists = user.wishlist.find((w) => w.product.toString() === productId);

            // REMOVE FROM WISHLIST
            if (exists) {
                user.wishlist = user.wishlist.filter(
                    (w) => w.product.toString() !== productId
                );
                await user.save();

                await Interaction.create({
                    user: userId,
                    product: productId,
                    type: "wishlist_remove",
                });

                await Product.updateOne(
                    { _id: productId },
                    { $inc: { wishlistCount: -1 } }
                ).catch(() => { });

                return res.json({ wishlisted: false });
            }

            // ADD TO WISHLIST
            user.wishlist.push({ product: productId });
            await user.save();

            await Interaction.create({
                user: userId,
                product: productId,
                type: "wishlist_add",
            });

            await Product.updateOne(
                { _id: productId },
                { $inc: { wishlistCount: 1 } }
            ).catch(() => { });

            res.json({ wishlisted: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                message: "Failed to toggle wishlist",
                error: err.message,
            });
        }
    }
);

export default router;
