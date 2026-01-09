// controllers/orderController.js

import mongoose from "mongoose";
import Order from "../model/order.model.js"; // Adjust path
import Product from "../model/product.model.js";
import User from "../model/user.model.js";
import shortid from "shortid";

// Razor pay
import { asyncHandler } from "../middlewares/razorpayWebhook.js"; // For webhook
import { createRazorpayOrder, handleRazorpayWebhook, verifyAndCapturePayment } from "../services/razorpay.service.js";

export const createOrder = asyncHandler(async (req, res) => {

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { userId, items, shippingAddressId, paymentMethod = "cod" } = req.body;

    const user = await User.findById(userId).session(session);
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

    const shippingAddr = user.addresses.id(shippingAddressId);
    if (!shippingAddr) throw Object.assign(new Error("Shipping address not found"), { status: 400 });

    const orderItems = [];
    let subTotal = 0;

    for (const it of items) {
      const product = await Product.findById(it.productId).session(session);
      if (!product) throw Object.assign(new Error("Product not found"), { status: 404 });

      let unitPrice = product.price;
      let variantSnapshot = null;
      let variant = null;

      if (it.variantId) {
        variant = product.variants?.id(it.variantId);
        if (!variant) throw Object.assign(new Error("Variant not found"), { status: 400 });
      }
      else if (it.size && it.color) {
        const matches = product.variants?.filter(v => v.size === it.size && v.color === it.color);
        if (!matches?.length) throw Object.assign(new Error("Variant not found"), { status: 400 });
        if (matches.length > 1) throw Object.assign(new Error("Multiple variants match"), { status: 400 });
        variant = matches[0];
      }

      if (variant) {
        if (variant.stock < it.quantity) throw Object.assign(new Error("Insufficient stock"), { status: 400 });
        variant.stock -= it.quantity;
        unitPrice += (variant.priceAdjustment || 0);
        variantSnapshot = { variantId: variant._id, size: variant.size, color: variant.color, priceAdjustment: variant.priceAdjustment || 0 };
      }
      else {
        if (product.stock < it.quantity) throw Object.assign(new Error("Insufficient stock"), { status: 400 });
        product.stock -= it.quantity;
      }

      await product.save({ session });

      const lineTotal = unitPrice * it.quantity;
      subTotal += lineTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0] || null,
        sku: product.sku || '',
        unitPrice,
        quantity: it.quantity,
        variant: variantSnapshot,
        lineTotal
      });
    }

    const discount = 0; // TODO
    const tax = Math.round(subTotal * 0.18 * 100) / 100;
    const shippingCost = 50; // TODO
    const total = subTotal - discount + tax + shippingCost;

    const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${shortid.generate()}`;

    const order = await Order.create([{
      orderNumber,
      customer: user._id,
      items: orderItems,
      shippingAddress: { ...shippingAddr.toObject() }, // Snapshot
      billingAddress: { ...shippingAddr.toObject() },
      subTotal,
      discount,
      tax,
      shippingCost,
      total,
      payment: { method: paymentMethod, status: "pending" },
      status: 'created',
      placedAt: new Date()
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const created = await Order.findById(order[0]._id)
      .populate({ path: 'customer', select: 'name email phone addresses' })
      .populate({ path: 'items.product', select: 'name slug images price brand category sku' })
      .populate({ path: 'items.product.category', select: 'name slug' });

    let razorpayResponse = null;

    // Delegate to service for non-COD
    if (paymentMethod !== "cod") {
      const razorpayOrderDetails = await createRazorpayOrder({
        orderId: order[0]._id,
        orderNumber,
        total,
        userId
      });
      razorpayResponse = {
        key: process.env.RAZORPAY_API_KEY,
        ...razorpayOrderDetails,
        name: "Your Store Name" // Customize
      };
    }

    res.status(201).json({ success: true, order: created, razorpay: razorpayResponse });
  } catch (err) {
    await session.abortTransaction().catch(() => { });
    session.endSession();
    if (err.status) res.status(err.status).json({ success: false, error: err.message });
    else next(err);
  }
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const razorpayDetails = req.body;

  const result = await verifyAndCapturePayment(orderId, razorpayDetails);
  res.status(200).json(result);
});

export const webhookHandler = asyncHandler(async (req, res) => {
  const { body: eventBody } = req;
  const signature = req.headers["x-razorpay-signature"];

  const result = await handleRazorpayWebhook(eventBody, signature);
  if (result.success) {
    res.status(200).send("OK");
  } else {
    res.status(400).json(result);
  }
});