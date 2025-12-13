import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    res.json({ message: "Product routes working!" });
});

export default router;
