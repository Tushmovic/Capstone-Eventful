import mongoose, { Schema, Model } from 'mongoose';
import { IPayment } from '../interfaces/ticket.interface';

interface IPaymentModel extends Model<IPayment> {
  findByReference(reference: string): Promise<IPayment | null>;
  findByUser(userId: string): Promise<IPayment[]>;
  findByEvent(eventId: string): Promise<IPayment[]>;
}

const paymentSchema = new Schema<IPayment, IPaymentModel>(
  {
    reference: {
      type: String,
      required: [true, 'Payment reference is required'],
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event is required'],
      index: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: [true, 'Ticket is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    status: {
      type: String,
      enum: ['pending', 'successful', 'failed'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'card',
    },
    paystackData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
paymentSchema.index({ reference: 1 }, { unique: true });
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ eventId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ status: 1 });

// Static methods
paymentSchema.statics.findByReference = function (reference: string) {
  return this.findOne({ reference })
    .populate('userId', 'name email')
    .populate('eventId', 'title date location')
    .populate('ticketId', 'ticketNumber status');
};

paymentSchema.statics.findByUser = function (userId: string) {
  return this.find({ userId })
    .populate('eventId', 'title date location')
    .populate('ticketId', 'ticketNumber status')
    .sort({ createdAt: -1 });
};

paymentSchema.statics.findByEvent = function (eventId: string) {
  return this.find({ eventId })
    .populate('userId', 'name email')
    .populate('ticketId', 'ticketNumber status')
    .sort({ createdAt: -1 });
};

const Payment = mongoose.model<IPayment, IPaymentModel>('Payment', paymentSchema);

export default Payment;