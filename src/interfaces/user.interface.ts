import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  profileImage?: string;
  role: 'user' | 'creator' | 'admin';
  eventsCreated: Types.ObjectId[];
  ticketsBought: Types.ObjectId[];
  notifications: Types.ObjectId[];
  isEmailVerified: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
}

// ADD THIS INTERFACE - DON'T REMOVE EXISTING CODE
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    [key: string]: any;
  };
  token?: string;
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IUserRegister {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'creator';
}