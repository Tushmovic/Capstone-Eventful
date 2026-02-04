import { Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'creator' | 'eventee' | 'admin';
  profileImage?: string;
  isEmailVerified: boolean;
  phoneNumber?: string;
  bio?: string;
  website?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  eventsCreated: string[];
  ticketsBought: string[];
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserInput {
  name: string;
  email: string;
  password: string;
  role: 'creator' | 'eventee' | 'admin';
  phoneNumber?: string;
  profileImage?: string;
}

export interface ILoginInput {
  email: string;
  password: string;
}

export interface IAuthResponse {
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    profileImage?: string;
  };
  token: string;
  refreshToken: string;
}

// Export as default for easier imports
export default IUser;