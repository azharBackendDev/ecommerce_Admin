// services/razorpayService.js

import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../model/order.model.js";
import logger from "../utils/logger.js";


const RAZORPAY_CONFIG = {
  KEY_ID: process.env.RAZORPAY_API_KEY,
  KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET,
  CURRENCY: "INR",
  MIN_AMOUNT_INR: 1,
};

class RazorpayError extends Error{
  constructor(message, statusCode = 400, razorpayError = null) {
    super(message);
    this.name = "RazorpayError";
    this.statusCode = statusCode;
    this.razorpayError = razorpayError;
    this.isOperational = true;
  }
}

let razorpayInstance = null;
function getRazorpayInstance() {
  if (!razorpayInstance) {
    if (!RAZORPAY_CONFIG.KEY_ID || !RAZORPAY_CONFIG.KEY_SECRET) {
      throw new RazorpayError("Razorpay credentials not configured", 500);
    }
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_CONFIG.KEY_ID,
      key_secret: RAZORPAY_CONFIG.KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export async function createRazorpayOrder(orderDetails) {
  try {
    const { orderId, orderNumber, total, userId } = orderDetails;

    if (total < RAZORPAY_CONFIG.MIN_AMOUNT_INR) {
      throw new RazorpayError("Order total below minimum amount", 400);
    }
    const amountInPaise = Math.round(total * 100);
    if (amountInPaise % 100 !== 0) {
      throw new RazorpayError("Order total must be in whole paise", 400);
    }

    const razorpay = getRazorpayInstance();
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: RAZORPAY_CONFIG.CURRENCY,
      receipt: orderNumber,
      notes: {
        orderId: orderId.toString(),
        userId,
      },
    });

    logger.info(`Razorpay order created: ${razorpayOrder.id} for internal order ${orderNumber}`);

    return {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      status: razorpayOrder.status,
    };
  } catch (error) {
    if (error instanceof RazorpayError) throw error;
    logger.error("Razorpay order creation failed:", error);
    throw new RazorpayError("Failed to create payment order", 500, error);
  }
}

export function verifyPaymentSignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_CONFIG.KEY_SECRET)
    .update(payload)
    .digest("hex");
  return expectedSignature === signature;
}

export async function verifyAndCapturePayment(orderId, razorpayDetails) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = razorpayDetails;

  try {
    // 1. Signature verification
    const payload = `${razorpay_order_id} | ${razorpay_payment_id}`;
    if (!verifyPaymentSignature(payload, razorpay_signature)) {
      throw new RazorpayError("Invalid payment signature", 400);
    }

    // 2. Fetch and validate payment from Razorpay
    const razorpay = getRazorpayInstance();
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.status !== "captured") {
      throw new RazorpayError("Payment not captured", 400);
    }

    // 3. Fetch internal order
    const order = await Order.findById(orderId);
    if (!order) {
      throw new RazorpayError("Order not found", 404);
    }
    if (order.payment.status !== "pending" || order.payment.method === "cod") {
      throw new RazorpayError("Payment already processed or invalid method", 400);
    }

    // 4. Validate amount and order match
    const expectedAmount = Math.round(order.total * 100);
    if (payment.order_id !== razorpay_order_id || payment.amount !== expectedAmount) {
      throw new RazorpayError("Payment amount or order mismatch", 400);
    }

    // 5. Update order (use session for atomicity if needed)
    order.payment.transactionId = razorpay_payment_id;
    order.payment.status = "paid";
    order.payment.paidAt = new Date();
    order.status = "confirmed"; // Adjust as per your workflow
    await order.save();

    logger.info(`Payment verified and captured: ${razorpay_payment_id} for order ${orderId}`);

    // TODO: Trigger events like email/SMS (e.g., via Bull queue or direct)

    return { success: true, order };
  } catch (error) {
    if (error instanceof RazorpayError) throw error;
    logger.error("Payment verification failed:", error);
    throw new RazorpayError("Payment verification failed", 500, error);
  }
}

export async function handleRazorpayWebhook(eventBody, signatureHeader) {
  try {
    const { event, payload } = eventBody;

    if (!verifyWebhookSignature(eventBody, signatureHeader)) {
      throw new RazorpayError("Invalid webhook signature", 401);
    }

    if (event === "payment.captured") {
      const { payment } = payload;
      const { entity } = payment;
      const { id: paymentId, receipt, order_id: razorpayOrderId, amount } = entity;

      const order = await Order.findOne({ orderNumber: receipt });
      if (!order) {
        logger.warn(`Webhook: Order not found for receipt ${receipt}`);
        return { success: false, message: "Order not found" };
      }

      if (order.payment.status === "paid") {
        logger.warn(`Webhook: Duplicate capture for ${paymentId}`);
        return { success: true, message: "Already processed" };
      }

      // Update order
      order.payment.transactionId = paymentId;
      order.payment.status = "paid";
      order.payment.paidAt = new Date();
      order.status = "confirmed";
      await order.save();

      logger.info(`Webhook: Payment captured ${paymentId} for order ${order._id}`);
      return { success: true, message: "Payment captured" };

    } else if (event === "payment.failed") {
      const { payment } = payload;
      const { entity } = payment;
      const { receipt } = entity;

      const order = await Order.findOne({ orderNumber: receipt });
      if (order && order.payment.status === "pending") {
        order.payment.status = "failed";
        await order.save();
        logger.info(`Webhook: Payment failed for order ${order._id}`);
      }

      return { success: true, message: "Payment failed handled" };
    }

    logger.info(`Webhook: Unhandled event ${event}`);
    return { success: true, message: "Unhandled event" };
  } catch (error) {
    logger.error("Webhook handling failed:", error);
    throw new RazorpayError("Webhook processing failed", 500, error);
  }
}

function verifyWebhookSignature(body, signature) {
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_CONFIG.WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest("hex");
  return expectedSignature === signature;
}

// Export for testing/mocking
export { RazorpayError, RAZORPAY_CONFIG };