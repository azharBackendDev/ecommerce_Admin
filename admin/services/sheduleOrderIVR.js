// services/scheduleOrderIVR.js
import mongoose from 'mongoose';
import Order from '../model/order.model.js';
import IVRCall from '../model/ivr.model.js';
import { addCallJob } from '../queues/callQueue.js';

export async function scheduleOrderIVR(orderNumber, delayMs) {

  console.log("startsheduleorderIVR..............");
  
  if (!orderNumber && orderNumber !== 0) throw new Error('orderNumber is required');
  if (typeof delayMs !== 'number' || Number.isNaN(delayMs) || delayMs < 0) throw new Error('delayMs must be a non-negative number');
  
  const order = await Order.findOne({ orderNumber });
  if (!order) throw new Error(`Order with orderNumber "${orderNumber}" not found`);

  const scheduledAt = new Date(Date.now() + delayMs);

  const prevIvrNextAt = order.ivrNextAt;
  const prevIvrLatestCall = order.ivrLatestCall;
  const prevIvrCallDone = order.ivrCallDone;

  const phone = order.shippingAddress?.phone || order.customerPhone || order.phone || null;
  if (!phone) throw new Error('No phone number available on order');

  const session = await mongoose.startSession();
  let ivrDoc = null;
  let jobId = null;

  try {
    session.startTransaction();

    const created = await IVRCall.create([{
      order: order._id,
      orderNumber: order.orderNumber,
      phone,
      type: 'order_reminder',
      scheduledAt,
      status: 'scheduled'
    }], { session });

    ivrDoc = created[0];

    order.ivrNextAt = scheduledAt;
    order.ivrLatestCall = ivrDoc._id;
    order.ivrCallDone = false;
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    
    console.log("before add call job ");

    // Schedule queue job and get job id
    jobId = await addCallJob(ivrDoc._id.toString(), scheduledAt);


    console.log("after add call job");
    
    // You can store jobId in ivrDoc if you want:
    if (jobId) {
      ivrDoc.jobId = jobId;
      await ivrDoc.save();
    }

    return { ivr: ivrDoc, jobId };
  } catch (err) {
    try { await session.abortTransaction(); } catch (e) {}
    session.endSession();
    // cleanup if needed
    if (ivrDoc && ivrDoc._id) {
      await IVRCall.deleteOne({ _id: ivrDoc._id }).catch(() => {});
    }
    await Order.updateOne({ _id: order._id }, {
      $set: {
        ivrNextAt: prevIvrNextAt ?? null,
        ivrLatestCall: prevIvrLatestCall ?? null,
        ivrCallDone: prevIvrCallDone ?? false
      }
    }).catch(() => {});
    throw err;
  }
}
