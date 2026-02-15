import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  wallet: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: 'credit' | 'debit' | 'refund';
  amount: number;
  balance: number;
  description: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: any;
  relatedTicket?: mongoose.Types.ObjectId;
  relatedEvent?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: [true, 'Wallet is required'],
      index: true,
    } as any,
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    } as any,
    type: {
      type: String,
      enum: ['credit', 'debit', 'refund'],
      required: [true, 'Transaction type is required'],
    } as any,
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    } as any,
    balance: {
      type: Number,
      required: [true, 'Balance after transaction is required'],
    } as any,
    description: {
      type: String,
      required: [true, 'Description is required'],
    } as any,
    reference: {
      type: String,
      required: [true, 'Reference is required'],
      unique: true,
    } as any,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    } as any,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    } as any,
    relatedTicket: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
    } as any,
    relatedEvent: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
    } as any,
  },
  {
    timestamps: true,
  }
);

// Indexes
transactionSchema.index({ wallet: 1, createdAt: -1 });
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 }, { unique: true });
transactionSchema.index({ type: 1, status: 1 });

const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;