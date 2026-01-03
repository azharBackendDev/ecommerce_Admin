// controllers/orderController.js (Key fixes: variant logic, category populate, SKU snapshot, billing default, COD simplify)
import mongoose from "mongoose";
import Order from "../model/order.model.js";
import Product from "../model/product.model.js";
import User from "../model/user.model.js";
import shortid from "shortid"; // optional for orderNumber

export async function createOrder(req, res, next) {
  // TODO: Add input validation (e.g., Joi for req.body: userId, items[{productId, quantity, variantId?, size?, color?}], etc.)
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { userId, items, shippingAddressId, paymentMethod = "cod" } = req.body; // Default to COD

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

      // FIXED: Improved variant logic – handle variantId OR (size + color)
      if (it.variantId) {
        // Match by subdoc _id
        variant = product.variants?.id(it.variantId);
        if (!variant) throw Object.assign(new Error("Variant not found"), { status: 400 });
      } else if (it.size && it.color) {
        // Match by size + color (assume unique combo)
        const matches = product.variants?.filter(v => v.size === it.size && v.color === it.color);
        if (!matches || matches.length === 0) throw Object.assign(new Error("Variant not found"), { status: 400 });
        if (matches.length > 1) throw Object.assign(new Error("Multiple variants match size/color – ambiguous"), { status: 400 });
        variant = matches[0];
      }

      if (variant) {
        // Variant case
        if (variant.stock < it.quantity) throw Object.assign(new Error("Insufficient stock for variant"), { status: 400 });
        variant.stock = (variant.stock || 0) - it.quantity;
        if (variant.stock < 0) throw Object.assign(new Error("Stock went negative"), { status: 400 }); // Extra safety
        unitPrice += (variant.priceAdjustment || 0);
        variantSnapshot = {
          variantId: variant._id,
          size: variant.size,
          color: variant.color,
          priceAdjustment: variant.priceAdjustment || 0
        };
      } else {
        // Base product case
        if (product.stock < it.quantity) throw Object.assign(new Error("Insufficient stock"), { status: 400 });
        product.stock = (product.stock || 0) - it.quantity;
        if (product.stock < 0) throw Object.assign(new Error("Stock went negative"), { status: 400 });
      }

      // Save product (variants are subdocs, so saved with parent)
      await product.save({ session });

      const lineTotal = unitPrice * it.quantity;
      subTotal += lineTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0] || null,
        sku: product.sku || '', // FIXED: Added SKU snapshot
        unitPrice,
        quantity: it.quantity,
        variant: variantSnapshot,
        lineTotal
      });
    }

    // calculate taxes/shipping/discounts as per your logic
    const discount = 0; // TODO: Dynamic (e.g., from coupon)
    const tax = Math.round(subTotal * 0.18 * 100) / 100; // example 18% GST
    const shippingCost = 50; // TODO: Dynamic (e.g., based on pincode)
    const total = subTotal - discount + tax + shippingCost;

    const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${shortid.generate()}`;

    const order = await Order.create([{
      orderNumber,
      customer: user._id,
      items: orderItems,
      shippingAddress: {
        fullName: shippingAddr.fullName,
        phone: shippingAddr.phone,
        addressLine1: shippingAddr.addressLine1,
        addressLine2: shippingAddr.addressLine2,
        city: shippingAddr.city,
        state: shippingAddr.state,
        pincode: shippingAddr.pincode,
        country: shippingAddr.country
      },
      billingAddress: { // FIXED: Default to copy of shipping (common for individuals)
        ...shippingAddr.toObject() // Shallow copy
      },
      subTotal,
      discount,
      tax,
      shippingCost,
      total,
      payment: {
        method: paymentMethod,
        status: "pending" // FIXED: Simplified – always pending on create; for non-COD, update post-gateway
        // TODO: For card/UPI, integrate gateway here and set "paid" if success
      },
      status: 'created',
      placedAt: new Date()
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // FIXED: Populate with category (product.category ref populated for name/slug)
    const created = await Order.findById(order[0]._id)
      .populate({
        path: 'customer',
        select: 'name email phone addresses'
      })
      .populate({
        path: 'items.product',
        select: 'name slug images price brand category sku' // Added category & sku
      })
      .populate({
        path: 'items.product.category',
        select: 'name slug' // Populates category details
      });

    return res.status(201).json({ success: true, order: created });
  } catch (err) {
    await session.abortTransaction().catch(() => { });
    session.endSession();
    return next(err);
  }
}