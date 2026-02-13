import mongoose, { Schema } from 'mongoose';

const analyticsSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  views: { type: Number, default: 0 },
  ticketSales: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
});

export default mongoose.model('Analytics', analyticsSchema);