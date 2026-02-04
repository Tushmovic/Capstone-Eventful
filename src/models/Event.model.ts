import mongoose, { Schema } from 'mongoose';
import { IEvent } from '../interfaces/event.interface';
import { constants } from '../config/constants';

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      minlength: [5, 'Event title must be at least 5 characters'],
      maxlength: [200, 'Event title cannot exceed 200 characters'],
      index: 'text',
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      minlength: [20, 'Event description must be at least 20 characters'],
      maxlength: [5000, 'Event description cannot exceed 5000 characters'],
      index: 'text',
    },
    category: {
      type: String,
      required: [true, 'Event category is required'],
      index: true,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    date: {
      type: Date,
      required: [true, 'Event date is required'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'],
    },
    location: {
      venue: {
        type: String,
        required: [true, 'Venue is required'],
        trim: true,
      },
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
        index: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
        index: true,
      },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    organizer: {
      name: {
        type: String,
        required: [true, 'Organizer name is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Organizer email is required'],
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        required: [true, 'Organizer phone is required'],
        trim: true,
      },
      website: {
        type: String,
        trim: true,
      },
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ticketPrice: {
      type: Number,
      required: [true, 'Ticket price is required'],
      min: [0, 'Ticket price cannot be negative'],
      index: true,
    },
    availableTickets: {
      type: Number,
      required: true,
      default: function() {
        return (this as any).totalTickets;
      },
      min: [0, 'Available tickets cannot be negative'],
    },
    totalTickets: {
      type: Number,
      required: [true, 'Total tickets is required'],
      min: [1, 'Total tickets must be at least 1'],
    },
    images: [{
      type: String,
      trim: true,
    }],
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'draft',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
      index: true,
    },
    reminders: [{
      type: {
        type: String,
        enum: ['1h', '1d', '1w', 'custom'],
        required: true,
      },
      customTime: {
        type: Date,
      },
    }],
    shareCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
eventSchema.index({ title: 'text', description: 'text', 'location.city': 'text', 'location.country': 'text' });
eventSchema.index({ status: 1, visibility: 1 });
eventSchema.index({ category: 1, tags: 1 });
eventSchema.index({ date: 1, startTime: 1 });
eventSchema.index({ ticketPrice: 1 });
eventSchema.index({ createdAt: -1 });

// Virtuals
eventSchema.virtual('isSoldOut').get(function() {
  return this.availableTickets === 0;
});

eventSchema.virtual('daysUntilEvent').get(function() {
  const now = new Date();
  const eventDate = new Date(this.date);
  const diffTime = eventDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to ensure availableTickets doesn't exceed totalTickets
eventSchema.pre('save', function(next) {
  if (this.availableTickets > this.totalTickets) {
    this.availableTickets = this.totalTickets;
  }
  next();
});

// Static methods
eventSchema.statics.findByCreator = function(creatorId: string) {
  return this.find({ creator: creatorId });
};

eventSchema.statics.findPublished = function() {
  return this.find({ status: 'published', visibility: 'public' });
};

eventSchema.statics.findUpcoming = function() {
  return this.find({ 
    status: 'published', 
    visibility: 'public',
    date: { $gte: new Date() }
  });
};

// Instance methods
eventSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

eventSchema.methods.incrementShares = function() {
  this.shareCount += 1;
  return this.save();
};

eventSchema.methods.updateTicketAvailability = function(ticketsSold: number) {
  this.availableTickets = Math.max(0, this.availableTickets - ticketsSold);
  return this.save();
};

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;