import mongoose, { Schema, Model } from 'mongoose';
import { ITicket } from '../interfaces/ticket.interface';

interface ITicketModel extends Model<ITicket> {
  findByTicketNumber(ticketNumber: string): Promise<ITicket | null>;
  findByUser(userId: string): Promise<ITicket[]>;
  findByEvent(eventId: string): Promise<ITicket[]>;
  findByPaymentReference(reference: string): Promise<ITicket | null>;
}

const ticketSchema = new Schema<ITicket, ITicketModel>(
  {
    ticketNumber: {
      type: String,
      required: [true, 'Ticket number is required'],
      unique: true,
      index: true,
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event is required'],
      index: true,
    } as any,
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    } as any,
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'used', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },
    qrCode: {
      type: String,
      required: [true, 'QR code is required'],
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    usedAt: {
      type: Date,
    },
    paymentReference: {
      type: String,
      required: [true, 'Payment reference is required'],
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'successful', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    metadata: {
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
ticketSchema.index({ ticketNumber: 1 }, { unique: true });
ticketSchema.index({ event: 1, user: 1 });
ticketSchema.index({ status: 1, paymentStatus: 1 });
ticketSchema.index({ purchaseDate: -1 });
ticketSchema.index({ paymentReference: 1 }, { unique: true });

// Virtuals
ticketSchema.virtual('isValid').get(function () {
  const now = new Date();
  const eventDate = (this.event as any)?.date || new Date();
  
  return (
    this.status === 'confirmed' &&
    this.paymentStatus === 'successful' &&
    eventDate > now
  );
});

ticketSchema.virtual('daysUntilEvent').get(function () {
  const eventDate = (this.event as any)?.date || new Date();
  const now = new Date();
  const diffTime = eventDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static methods
ticketSchema.statics.findByTicketNumber = function (ticketNumber: string) {
  return this.findOne({ ticketNumber })
    .populate('event')
    .populate('user', 'name email profileImage');
};

ticketSchema.statics.findByUser = function (userId: string) {
  return this.find({ user: userId })
    .populate('event')
    .sort({ purchaseDate: -1 });
};

ticketSchema.statics.findByEvent = function (eventId: string) {
  return this.find({ event: eventId })
    .populate('user', 'name email profileImage')
    .sort({ purchaseDate: -1 });
};

ticketSchema.statics.findByPaymentReference = function (reference: string) {
  return this.findOne({ paymentReference: reference })
    .populate('event')
    .populate('user');
};

// Instance methods
ticketSchema.methods.markAsUsed = function () {
  this.status = 'used';
  this.usedAt = new Date();
  return this.save();
};

ticketSchema.methods.cancelTicket = function () {
  this.status = 'cancelled';
  return this.save();
};

const Ticket = mongoose.model<ITicket, ITicketModel>('Ticket', ticketSchema);

export default Ticket;