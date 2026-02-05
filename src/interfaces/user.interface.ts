import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  profileImage?: string;
  role: 'creator' | 'eventee' | 'admin';
  bio?: string;
  website?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  isEmailVerified: boolean;
  eventsCreated: Types.ObjectId[];
  ticketsBought: Types.ObjectId[];
  notifications: Types.ObjectId[];
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
}

// Interface for user registration/creation
export interface IUserInput {
  name: string;
  email: string;
  password: string;
  role?: 'creator' | 'eventee' | 'admin';
  phoneNumber?: string;
  bio?: string;
  website?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

// Interface for login
export interface ILoginInput {
  email: string;
  password: string;
}

// Interface for auth response
export interface IAuthResponse {
  success: boolean;
  message: string;
  token?: string;
  refreshToken?: string;
  user?: {
    _id: string;  // Changed from Types.ObjectId to string for response
    name: string;
    email: string;
    role: string;
    profileImage?: string;
    [key: string]: any;
  };
}

// Extended Request interface for authenticated requests
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    [key: string]: any;
  };
  token?: string;
}

// Interface for user registration (same as IUserInput but different name for clarity)
export interface IUserRegister {
  name: string;
  email: string;
  password: string;
  role?: 'creator' | 'eventee' | 'admin';
}