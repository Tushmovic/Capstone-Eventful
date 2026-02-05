import { Document, Types } from 'mongoose';
import { IEvent } from './event.interface';
import { IUser } from './user.interface';

export interface ITicket extends Document {
  ticketNumber: string;
  event: Types.ObjectId | IEvent;
  user: Types.ObjectId | IUser;
  price: number;
  status: 'pending' | 'confirmed' | 'used' | 'cancelled' | 'expired';
  qrCode: string;
  purchaseDate: Date;
  usedAt?: Date;
  paymentReference: string;
  paymentStatus: 'pending' | 'successful' | 'failed' | 'refunded';
  metadata?: any;
  isValid?: boolean;
  daysUntilEvent?: number;
  markAsUsed(): Promise<ITicket>;
  cancelTicket(): Promise<ITicket>;
}

export interface IPayment extends Document {
  reference: string;
  userId: Types.ObjectId | IUser;
  eventId: Types.ObjectId | IEvent;
  ticketId: Types.ObjectId | ITicket;
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed';
  paymentMethod: string;
  paystackData?: any;
}

export interface IPurchaseTicketInput {
  eventId: string;
  userId: string;
  quantity: number;
}

export interface ICreateTicketInput {
  eventId: string;
  userId: string;
  ticketNumber: string;
  price: number;
  paymentReference: string;
}

export interface IVerifyTicketResponse {
  isValid: boolean;
  ticket: ITicket;
  event: IEvent;
  user: IUser;
  message: string;
}