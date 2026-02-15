import { Document, Types } from 'mongoose';

export interface IWallet extends Document {
  user: Types.ObjectId;
  balance: number;
  currency: string;
  isActive: boolean;
  lastTransactionAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction extends Document {
  wallet: Types.ObjectId;
  user: Types.ObjectId;
  type: 'credit' | 'debit' | 'refund';
  amount: number;
  balance: number;
  description: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: any;
  relatedTicket?: Types.ObjectId;
  relatedEvent?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateWalletInput {
  userId: string;
}

export interface IWalletResponse {
  _id: string;
  balance: number;
  currency: string;
  lastTransactionAt: Date;
}

export interface ITransactionResponse {
  _id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  reference: string;
  status: string;
  createdAt: Date;
}

export interface IWalletTransactionInput {
  userId: string;
  amount: number;
  description: string;
  reference?: string;
  metadata?: any;
  relatedTicket?: string;
  relatedEvent?: string;
}

export interface IWalletTransferInput {
  fromUserId: string;
  toUserId: string;
  amount: number;
  description: string;
}