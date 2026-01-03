// models/IVRCall.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const IVRCallSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: false },
  orderNumber: { type: String },
  phone: { type: String, required: true, index: true },
  type: { type: String, enum: ['order_reminder', 'manual', 'bulk', 'retry'], default: 'order_reminder' },

  scheduledAt: { type: Date, index: true },
  attempts: { type: Number, default: 0 },

  // use a consistent name: callSid
  callSid: { type: String, index: true },

  // status lifecycle
  status: {
    type: String,
    enum: ['scheduled', 'queued', 'triggering', 'triggered', 'ringing', 'completed', 'failed', 'no_input', 'cancelled', 'error'],
    default: 'scheduled',
    index: true
  },
  triggeredAt: Date,
  completedAt: Date,
  durationSeconds: Number,

  digit: String, // DTMF
  result: { type: String }, // e.g. 'confirmed', 'cancelled'

  triggerResponse: Schema.Types.Mixed,   // response from Exotel when triggering call
  webhookPayloads: { type: [Schema.Types.Mixed], default: [] }, // raw webhook posts (DTMF etc)

  node: String,
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now }

}, { timestamps: true });

// useful indexes
IVRCallSchema.index({ phone: 1, scheduledAt: 1 });
IVRCallSchema.index({ order: 1, createdAt: -1 });

export default model('IVRCall', IVRCallSchema);
