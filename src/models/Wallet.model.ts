import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
  user: mongoose.Types.ObjectId;
  balance: number;
  currency: string;
  isActive: boolean;
  lastTransactionAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      unique: true,
      index: true,
    } as any,
    balance: {
      type: Number,
      required: [true, 'Balance is required'],
      default: 0,
      min: [0, 'Balance cannot be negative'],
    } as any,
    currency: {
      type: String,
      default: 'NGN',
      enum: ['NGN'],
    } as any,
    isActive: {
      type: Boolean,
      default: true,
    } as any,
    lastTransactionAt: {
      type: Date,
      default: Date.now,
    } as any,
  },
  {
    timestamps: true,
  }
);

// Indexes
walletSchema.index({ user: 1 }, { unique: true });
walletSchema.index({ balance: 1 });

const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);

export default Wallet;