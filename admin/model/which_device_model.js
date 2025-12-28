// DeviceToken / PushSubscription
const DeviceSchema = new Schem({
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
