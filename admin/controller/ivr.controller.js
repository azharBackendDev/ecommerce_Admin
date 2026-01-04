// controllers/ivrController.js
import Order from '../model/order.model.js';
import IVRCall from '../model/ivr.model.js';
import { scheduleOrderIVR } from '../services/sheduleOrderIVR.js';
import { addCallJob, triggerNow } from '../queues/callQueue.js';

import pkg from 'xmlbuilder2'
const { create } = pkg;


export async function scheduleIVRForOrder(req, res, next) {
  try {
    const { orderNumber } = req.params;
    const { delayMs } = req.body; // or scheduledAt ISO
    if (!delayMs && !req.body.scheduledAt) return res.status(400).json({ error: 'delayMs or scheduledAt required' });

    const delay = delayMs ? Number(delayMs) : (new Date(req.body.scheduledAt).getTime() - Date.now());
    const { ivr, jobId } = await scheduleOrderIVR(orderNumber, delay);
    return res.json({ ok: true, ivr, jobId });
  } catch (err) {
    return next(err);
  }
}


export async function cancelIVRForOrder(req, res, next) {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber }).populate('ivrLatestCall');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const ivr = order.ivrLatestCall;
    if (!ivr) {
      order.ivrCallDone = true;
      await order.save();
      return res.json({ ok: true, message: 'No ivr found; marked done on order' });
    }
    ivr.status = 'cancelled';
    await ivr.save();
    order.ivrCallDone = true;
    await order.save();
    // if you stored jobId in ivr.jobId you could remove job: await callQueue.getJob(ivr.jobId).then(job => job && job.remove());
    return res.json({ ok: true, ivr });
  } catch (err) {
    return next(err);
  }
}

export async function manualTrigger(req, res, next) {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // create a manual IVRCall record and immediately trigger
    const ivr = await IVRCall.create({
      order: order._id,
      orderNumber: order.orderNumber,
      phone: order.shippingAddress?.phone || order.customerPhone || order.phone,
      type: 'manual',
      scheduledAt: new Date(),
      status: 'scheduled'
    });

    const jobId = await triggerNow(ivr._id.toString());
    ivr.jobId = jobId;
    await ivr.save();

    order.callLogs = order.callLogs || [];
    order.callLogs.push({ event: 'manual_trigger_enqueued', time: new Date(), ivrId: ivr._id });
    await order.save();

    return res.json({ ok: true, ivr, jobId });
  } catch (err) {
    return next(err);
  }
}

/* ---------- Exotel start endpoint (returns XML) ---------- */
export function exotelStart(req, res) {
  const doc = create({ version: '1.0' })
    .ele('Response')
    .ele('Say', { language: 'hi-IN' }).txt('Namaskar. Aapne hamari website se order kiya hai. Order cancel ke liye 1 dabaiye. Order confirm ke liye 2 dabaiye.').up()
    .ele('Gather', { action: `${process.env.BASE_URL.replace(/\/$/, '')}/exotel/ivr-response`, method: 'POST', numDigits: 1, timeout: 8 }).up()
    .up();
  res.type('text/xml').send(doc.end({ prettyPrint: true }));
}

/* ---------- Exotel response (DTMF) ---------- */
export async function exotelResponse(req, res, next) {
  try {
    const { Digits, CallSid, From } = req.body;

    // First try to find IVR by CallSid
    let ivr = await IVRCall.findOne({ callSid: CallSid });
    let order = null;
    if (ivr) {
      ivr.webhookPayloads = ivr.webhookPayloads || [];
      ivr.webhookPayloads.push(req.body);
      ivr.digit = Digits;
      ivr.result = Digits === '1' ? 'cancelled' : Digits === '2' ? 'confirmed' : 'invalid';
      ivr.status = 'completed';
      ivr.completedAt = new Date();
      await ivr.save();
      if (ivr.order) order = await Order.findById(ivr.order);
    } else {
      // fallback: find by phone where not done
      order = await Order.findOne({ $or: [{ 'shippingAddress.phone': From }, { phone: From }], ivrCallDone: false });
      if (order) {
        order.callLogs = order.callLogs || [];
        order.callLogs.push({ event: 'fallback_keypress', digits: Digits, raw: req.body, time: new Date() });
        if (Digits === '1') order.status = 'cancelled';
        if (Digits === '2') order.status = 'confirmed';
        order.ivrCallDone = true;
        await order.save();
      } else {
        // optional: verify CallSid via Exotel API
      }
    }

    // If we found an order via IVR, update order
    if (order) {
      if (Digits === '1') order.status = 'cancelled';
      if (Digits === '2') order.status = 'confirmed';
      order.ivrCallDone = true;
      order.callLogs = order.callLogs || [];
      order.callLogs.push({ event: 'keypress', digits: Digits, time: new Date(), raw: req.body });
      await order.save();
    }


    const resp = create({ version: '1.0' }).ele('Response').ele('Say').txt('Dhanyavaad. Aapka response save kar liya gaya hai.').up().up();


    res.type('text/xml').send(resp.end({ prettyPrint: true }));
  } catch (err) {
    return next(err);
  }
}
