import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../interfaces/user.interface';
import { constants } from '../config/constants';

// Define the User interface for the model
interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser, IUserModel>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    } as any, // Type assertion to fix TypeScript issue
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    } as any,
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    } as any,
    role: {
      type: String,
      enum: [constants.ROLES.CREATOR, constants.ROLES.EVENTEE, constants.ROLES.ADMIN],
      default: constants.ROLES.EVENTEE,
      required: true,
    } as any,
    profileImage: {
      type: String,
      default: 'https://res.cloudinary.com/demo/image/upload/v1674576809/default-avatar.png',
    } as any,
    isEmailVerified: {
      type: Boolean,
      default: false,
    } as any,
    phoneNumber: {
      type: String,
      trim: true,
    } as any,
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    } as any,
    website: {
      type: String,
      trim: true,
    } as any,
    socialMedia: {
      twitter: { type: String, trim: true } as any,
      facebook: { type: String, trim: true } as any,
      instagram: { type: String, trim: true } as any,
      linkedin: { type: String, trim: true } as any,
    } as any,
    eventsCreated: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Event',
      } as any,
    ],
    ticketsBought: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ticket',
      } as any,
    ],
    notificationPreferences: {
      email: { type: Boolean, default: true } as any,
      sms: { type: Boolean, default: false } as any,
      push: { type: Boolean, default: true } as any,
    } as any,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for better query performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    const user = this as unknown as IUser & Document;
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    const user = this as unknown as IUser & Document;
    return await bcrypt.compare(candidatePassword, user.password);
  } catch (error) {
    throw error;
  }
};

// Static method to find user by email
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email }).select('+password');
};

// Virtual for user's full profile URL
userSchema.virtual('profileUrl').get(function () {
  const user = this as unknown as IUser & Document;
  return `${process.env.API_BASE_URL}/users/${user._id}/profile`;
});

const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;