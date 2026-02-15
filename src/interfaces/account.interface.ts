import { Document, Types } from 'mongoose';

export interface IAccount extends Document {
  user: Types.ObjectId;
  name: string;
  email: string;
  role: 'creator' | 'eventee';
  profileImage: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateAccountInput {
  userId: string;
  name: string;
  email: string;
  role: 'creator' | 'eventee';
  profileImage?: string;
}

export interface ISwitchAccountInput {
  userId: string;
  accountId: string;
  role: string;
}

export interface IAccountResponse {
  _id: string;
  name: string;
  email: string;
  role: string;
  profileImage: string;
  isActive: boolean;
}