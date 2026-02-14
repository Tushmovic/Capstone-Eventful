import mongoose, { Schema } from 'mongoose';

export interface INewsletter extends mongoose.Document {
  email: string;
  subscribedAt: Date;
  status: 'active' | 'unsubscribed';
}

const newsletterSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed'],
    default: 'active'
  }
});

export default mongoose.model<INewsletter>('Newsletter', newsletterSchema);