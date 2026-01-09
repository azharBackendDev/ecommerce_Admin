// middleware/razorpayWebhook.js

import logger from "../utils/logger.js"; 

// ===================================================
// ✔️ Hum Future me aur security layers add kar sakte ho (IP whitelist, rate limit)
// ===================================================

// ===================================================
// Razorpay expects raw JSON body for signature verification
// ===================================================

export const razorpayWebhookMiddleware = [
  (req, res, next) => {
    if (req.headers["content-type"] !== "application/json") {
      return res.status(400).json({ error: "Content-Type must be application/json" });
    }
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        req.body = JSON.parse(data);
        next();
      } catch (err) {
        logger.error("Webhook body parse error:", err);
        res.status(400).json({ error: "Invalid JSON body" });
      }
    });
    req.on("error", (err) => {
      logger.error("Webhook request error:", err);
      res.status(400).json({ error: "Request error" });
    });
  },
  // ===================================================
  // Optional: Rate limiting, IP whitelisting (Razorpay IPs: fetch from their docs)
  // e.g., (req, res, next) => { if (!isRazorpayIP(req.ip)) return res.status(403).send(); next(); }
  // ===================================================
];

// For async middleware support (if using)
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};