// queues/callQueue.js
import Queue from 'bull';
import IORedis from 'ioredis';
import axios from 'axios';
import IVRCall from '../model/ivr.model.js';

const { REDIS_URL } = process.env;
if (!REDIS_URL) throw new Error('REDIS_URL is not set in env (use redis:// or rediss://)');

let urlHostname;
try {
  urlHostname = new URL(REDIS_URL).hostname;
} catch (e) {
  urlHostname = undefined;
}

const defaultRetryStrategy = (times) => Math.min(times * 50, 2000);

// helper to create IORedis instance and set TLS servername when needed
function makeIORedis(opts = {}) {
  const finalOpts = { ...opts };
  if (REDIS_URL.startsWith('rediss://')) {
    finalOpts.tls = finalOpts.tls || {};
    if (urlHostname) finalOpts.tls.servername = urlHostname;
  }
  return new IORedis(REDIS_URL, finalOpts);
}

// createClient for Bull: give different options per connection type
export const callQueue = new Queue('callQueue', {
  createClient(type) {
    switch (type) {
      case 'client':
        // used by producers (adding jobs). Fail-fast so HTTP endpoints don't hang.
        return makeIORedis({
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: defaultRetryStrategy
        });
      case 'subscriber':
        // required by Bull: allow commands to wait; disable ready check
        return makeIORedis({
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: defaultRetryStrategy
        });
      case 'bclient':
        // blocking client for some commands
        return makeIORedis({
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: defaultRetryStrategy
        });
      default:
        return makeIORedis();
    }
  }
});

// logs for quick debugging
callQueue.on('error', (err) => console.error('[callQueue] queue error', err && err.message));
callQueue.on('waiting', (jobId) => console.debug('[callQueue] job waiting', jobId));
callQueue.on('stalled', (job) => console.warn('[callQueue] job stalled', job.id));
callQueue.on('active', (job) => console.debug('[callQueue] job active', job.id));
callQueue.on('completed', (job) => console.debug('[callQueue] job completed', job.id));
callQueue.on('failed', (job, err) => console.warn('[callQueue] job failed', job.id, err && err.message));

// --- add job / triggerNow (unchanged logic) ---
export async function addCallJob(ivrId, fireAt) {
  console.log("start call job");
  const delay = Math.max(new Date(fireAt).getTime() - Date.now(), 0);
  console.log("code run after delay");
  const job = await callQueue.add({ ivrId }, {
    delay,
    attempts: 4,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: true,
    removeOnFail: false
  });
  console.log("add job successfully in queue", job.id);
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

// --- processor (unchanged logic) ---
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
      ivr.order.exotelCallSid = callSid;
      ivr.order.callLogs = ivr.order.callLogs || [];
      ivr.order.callLogs.push({ event: 'call_triggered', time: new Date(), ivrId: ivr._id });
      await ivr.order.save();
    }

    return true;
  } catch (err) {
    // Better logging so we can see the full HTTP response body from Exotel
    const status = err.response?.status;
    const body = err.response?.data;
    console.error('[callQueue] Exotel request failed', { status, body, message: err.message });

    const message = status ? `HTTP ${status}` : err.message;
    ivr.status = 'error';
    ivr.callLogs.push({
      event: 'trigger_failed',
      time: new Date(),
      error: message,
      httpBody: body,        // save full response body to DB for later inspection
      attempt: job.attemptsMade + 1
    });
    await ivr.save().catch(() => { });
    throw err;
  }
});
