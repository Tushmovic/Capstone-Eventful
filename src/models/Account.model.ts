import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: 'creator' | 'eventee';
  profileImage: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    } as any,
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    } as any,
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    } as any,
    role: {
      type: String,
      enum: ['creator', 'eventee'],
      required: [true, 'Role is required'],
    } as any,
    profileImage: {
      type: String,
      default: 'https://res.cloudinary.com/demo/image/upload/v1674576809/default-avatar.png',
    } as any,
    isActive: {
      type: Boolean,
      default: false,
    } as any,
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only have one account per role
accountSchema.index({ user: 1, role: 1 }, { unique: true });

const Account = mongoose.model<IAccount>('Account', accountSchema);

export default Account;