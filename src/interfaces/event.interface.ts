import { Document, Types } from 'mongoose';

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  tags: string[];
  date: Date;
  startTime: string;
  endTime: string;
  location: {
    venue: string;
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  organizer: {
    name: string;
    email: string;
    phone: string;
    website?: string;
  };
  creator: Types.ObjectId;
  ticketPrice: number;
  availableTickets: number;
  totalTickets: number;
  images: string[];
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  visibility: 'public' | 'private';
  reminders: {
    type: '1h' | '1d' | '1w' | 'custom';
    customTime?: Date;
  }[];
  shareCount: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  isSoldOut: boolean;
  daysUntilEvent: number;
}

export interface IEventInput {
  title: string;
  description: string;
  category: string;
  tags?: string[];
  date: Date;
  startTime: string;
  endTime: string;
  location: {
    venue: string;
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  organizer: {
    name: string;
    email: string;
    phone: string;
    website?: string;
  };
  ticketPrice: number;
  totalTickets: number;
  status?: 'draft' | 'published';
  visibility?: 'public' | 'private';
  reminders?: {
    type: '1h' | '1d' | '1w' | 'custom';
    customTime?: Date;
  }[];
}

export interface IEventUpdate {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  date?: Date;
  startTime?: string;
  endTime?: string;
  location?: {
    venue?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  organizer?: {
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  ticketPrice?: number;
  totalTickets?: number;
  status?: 'draft' | 'published' | 'cancelled';
  visibility?: 'public' | 'private';
  reminders?: {
    type: '1h' | '1d' | '1w' | 'custom';
    customTime?: Date;
  }[];
}

export interface IEventFilter {
  category?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  status?: string;
  visibility?: string;
  search?: string;
  creator?: string;
}