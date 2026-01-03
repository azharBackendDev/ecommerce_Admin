// queues/callQueue.js
import Queue from 'bull';
import axios from 'axios';
import IVRCall from '../model/IVRCall.js';
import Order from '../model/order.model.js';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) throw new Error('REDIS_URL is not set in env');

export const callQueue = new Queue('callQueue', REDIS_URL);

/** returns job.id so caller can store it */
export async function addCallJob(ivrId, fireAt) {
  const delay = Math.max(new Date(fireAt).getTime() - Date.now(), 0);
  const job = await callQueue.add({ ivrId }, {
    delay,
    attempts: 4,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: true,
    removeOnFail: false
  });
  return job.id;
}

export async function triggerNow(ivrId) {
  const job = await callQueue.add({ ivrId }, {
    delay: 0,
    attempts: 4,
    backoff: { type: 'exponential', delay: 10000 }
  });
  return job.id;
}

callQueue.process(5, async (job) => {
  const { ivrId } = job.data;
  if (!ivrId) throw new Error('No ivrId in job');

  const ivr = await IVRCall.findById(ivrId).populate('order');
  if (!ivr) throw new Error(`IVRCall ${ivrId} not found`);

  if (['triggered', 'completed', 'cancelled'].includes(ivr.status)) return true;

  const phone = ivr.phone || ivr.order?.shippingAddress?.phone || ivr.order?.customerPhone || ivr.order?.phone || null;

  if (!phone) {
    ivr.status = 'failed';
    ivr.callLogs = ivr.callLogs || [];
    ivr.callLogs.push({ event: 'failed_no_phone', time: new Date() });
    await ivr.save();
    throw new Error('No phone for IVR ' + ivrId);
  }

  ivr.status = 'triggering';
  ivr.attemptedAt = new Date();
  ivr.callLogs = ivr.callLogs || [];
  ivr.callLogs.push({ event: 'trigger_attempt', time: new Date(), attempt: job.attemptsMade + 1 });
  await ivr.save();

  try {
    const apiUrl = `https://api.exotel.com/v1/Accounts/${process.env.EXOTEL_ACCOUNT_SID}/Calls/connect.json`;
    const params = new URLSearchParams();
    params.append('From', process.env.EXOTEL_VIRTUAL_NUMBER);
    params.append('To', phone);
    params.append('CallerId', process.env.EXOTEL_VIRTUAL_NUMBER);
    params.append('Url', `${process.env.BASE_URL.replace(/\/$/, '')}/exotel/ivr`);

    const res = await axios.post(apiUrl, params.toString(), {
      auth: { username: process.env.EXOTEL_API_KEY, password: process.env.EXOTEL_API_TOKEN },
      timeout: 15000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const callSid = res.data?.Call?.Sid || res.data?.call_sid || null;
    ivr.callSid = callSid;
    ivr.triggerResponse = res.data;
    ivr.status = 'triggered';
    ivr.triggeredAt = new Date();
    ivr.callLogs.push({ event: 'triggered', time: new Date(), res: res.data });
    await ivr.save();

    if (ivr.order) {
      const order = await Order.findById(ivr.order._id);
      if (order) {
        order.exotelCallSid = callSid;
        order.callLogs = order.callLogs || [];
        order.callLogs.push({ event: 'call_triggered', time: new Date(), ivrId: ivr._id });
        await order.save();
      }
    }

    return true;
  } catch (err) {
    const message = err?.response ? `HTTP ${err.response.status}` : err.message;
    ivr.status = 'error';
    ivr.callLogs.push({ event: 'trigger_failed', time: new Date(), error: message, attempt: job.attemptsMade + 1 });
    await ivr.save().catch(() => {});
    throw err;
  }
});
