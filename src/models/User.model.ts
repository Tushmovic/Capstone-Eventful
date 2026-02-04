import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../interfaces/user.interface';
import { constants } from '../config/constants';

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: [constants.ROLES.CREATOR, constants.ROLES.EVENTEE, constants.ROLES.ADMIN],
      default: constants.ROLES.EVENTEE,
      required: true,
    },
    profileImage: {
      type: String,
      default: 'https://res.cloudinary.com/demo/image/upload/v1674576809/default-avatar.png',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    website: {
      type: String,
      trim: true,
    },
    socialMedia: {
      twitter: { type: String, trim: true },
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
    },
    eventsCreated: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Event',
      },
    ],
    ticketsBought: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ticket',
      },
    ],
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
    },
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

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Static method to find user by email
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email }).select('+password');
};

// Virtual for user's full profile URL
userSchema.virtual('profileUrl').get(function () {
  return `${process.env.API_BASE_URL}/api/v1/users/${this._id}/profile`;
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;