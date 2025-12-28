🧠 High-Level Notification Flow (Amazon / Flipkart style)
Order / Review / Wishlist Event
        ↓
Notification Service
        ↓
Save Notification (DB)
        ↓
Send Push
   ├── Mobile (FCM)
   └── Browser (Web Push)
        ↓
User receives notification
(even if app / site closed)

🧱 1️⃣ Required Collections (recap)
Notification (already created)

in-app inbox

read/unread state

Device / Subscription Collection (NEW – very important)
// DeviceToken / PushSubscription
const DeviceSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", index: true },
  platform: {
    type: String,
    enum: ["android", "ios", "web"],
    required: true
  },

  // Mobile
  fcmToken: String,

  // Web Push
  endpoint: String,
  keys: {
    p256dh: String,
    auth: String
  },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Device", DeviceSchema);

📱 2️⃣ Mobile Push (FCM) — Android / iOS
Install
npm install firebase-admin

Setup (once)
import admin from "firebase-admin";
import serviceAccount from "./firebase-service-account.json";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

Send Mobile Push Function
export async function sendFCMNotification(tokens, payload) {
  if (!tokens.length) return;

  const message = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.message
    },
    data: payload.data || {}
  };

  const response = await admin.messaging().sendMulticast(message);
  console.log("FCM sent:", response.successCount);
}

🌐 3️⃣ Web Push (Browser Notification)

👉 Works even if website closed (browser running)

Install
npm install web-push

Setup VAPID keys (one time)
npx web-push generate-vapid-keys

Init
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:support@yourapp.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

Send Web Push
export async function sendWebPush(subscriptions, payload) {
  const sendPromises = subscriptions.map(sub =>
    webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: sub.keys
      },
      JSON.stringify({
        title: payload.title,
        body: payload.message,
        data: payload.data
      })
    ).catch(err => console.error("WebPush error", err))
  );

  await Promise.allSettled(sendPromises);
}

🗃️ 4️⃣ NotificationService – Main Handler
import Notification from "../models/Notification.js";
import Device from "../models/Device.js";
import { sendFCMNotification } from "./fcm.js";
import { sendWebPush } from "./webpush.js";

export async function notifyUser({
  userId,
  type,
  title,
  message,
  data
}) {
  // 1️⃣ Save in-app notification
  await Notification.create({
    user: userId,
    type,
    title,
    message,
    data,
    channel: "in_app"
  });

  // 2️⃣ Fetch user devices
  const devices = await Device.find({ user: userId }).lean();

  // 3️⃣ Split devices
  const fcmTokens = devices
    .filter(d => d.fcmToken)
    .map(d => d.fcmToken);

  const webSubs = devices.filter(d => d.endpoint);

  // 4️⃣ Send push (async)
  await Promise.allSettled([
    sendFCMNotification(fcmTokens, { title, message, data }),
    sendWebPush(webSubs, { title, message, data })
  ]);
}

🧪 5️⃣ Example Use Case — Order Shipped
Order Service emits event
{
  "event": "ORDER_SHIPPED",
  "userId": "64ab...",
  "orderId": "ORD123"
}

Notification consumer
await notifyUser({
  userId,
  type: "order_update",
  title: "Your order has been shipped 🚚",
  message: "Order ORD123 is on the way!",
  data: { orderId: "ORD123" }
});

🖥️ 6️⃣ Frontend (Very Important Concept)
Browser:

Service Worker registered

User grants notification permission

Subscription saved to backend

const sub = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY
});

// send sub to backend

Mobile App:

App gets FCM token

Send token to backend /devices/register

🔐 7️⃣ Security & Best Practices

✅ One user → multiple devices
✅ Token refresh handling
✅ Invalid token cleanup
✅ Rate limit notifications
✅ User preference settings (mute promo, allow order updates)
✅ Retry failed sends via queue (BullMQ / SQS)

🧾 Notification Types (Real Apps)
Type	Channel
Order update	in_app + push
Price drop	push
Review reply	in_app
Promotion	push + email
System alert	all
❌ Common Mistakes (Avoid)

❌ Only push, no DB record
❌ Push inside request cycle (always async)
❌ No device table
❌ No user preferences
❌ No retry / cleanup

✅ Final Clarity

✔ Notification schema = inbox + history
✔ FCM / WebPush = delivery (even if app/site closed)
✔ Both together = Amazon/Flipkart-level system
✔ Service is async + event-driven

Agar chaho next main:

Service Worker code (browser)

FCM Android / iOS side

User notification preferences schema

Retry queue (BullMQ / Redis)

Notification microservice folder structure