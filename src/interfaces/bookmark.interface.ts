import { Document, Types } from 'mongoose';

export interface IBookmark extends Document {
  user: Types.ObjectId;
  event: Types.ObjectId;
  createdAt: Date;
}

export interface IBookmarkInput {
  userId: string;
  eventId: string;
}

export interface IBookmarkResponse {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  event: {
    _id: string;
    title: string;
    description: string;
    date: Date;
    location: {
      venue: string;
      city: string;
    };
    ticketPrice: number;
    images: string[];
  };
  createdAt: Date;
}