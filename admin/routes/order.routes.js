import { createOrder, verifyPayment, webhookHandler } from "../controller/order.controller.js";
import { Router } from "express";
import { razorpayWebhookMiddleware } from "../middlewares/razorpayWebhook.js";

const router = Router();


// ===================================================
// POST /api/products/orders - Create Order : Buy
// ===================================================
router.post('/orders', createOrder);


// ===================================================
// Post /api/products//:id/verify-payment - Verify payment
// ===================================================
router.post("/:id/verify-payment", verifyPayment);


// ===================================================
// Webhook: Apply middleware for raw body
// ===================================================
router.post("/webhook", razorpayWebhookMiddleware, webhookHandler);






export default router;