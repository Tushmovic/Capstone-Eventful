import mongoose, { Schema, Document } from 'mongoose';

export interface IBookmark extends Document {
  user: mongoose.Types.ObjectId;
  event: mongoose.Types.ObjectId;
  createdAt: Date;
}

const bookmarkSchema = new Schema<IBookmark>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    } as any,
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event is required'],
      index: true,
    } as any,
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only bookmark an event once
bookmarkSchema.index({ user: 1, event: 1 }, { unique: true });

const Bookmark = mongoose.model<IBookmark>('Bookmark', bookmarkSchema);

export default Bookmark;