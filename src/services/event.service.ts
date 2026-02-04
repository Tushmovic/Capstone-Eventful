import Event from '../models/Event.model';
import { IEvent, IEventInput, IEventUpdate, IEventFilter } from '../interfaces/event.interface';
import { logger } from '../utils/logger';
import { getFileUrl, deleteFile } from '../config/upload';
import User from '../models/User.model';

export class EventService {
  async createEvent(eventData: IEventInput, creatorId: string): Promise<IEvent> {
    try {
      const event = new Event({
        ...eventData,
        creator: creatorId,
        availableTickets: eventData.totalTickets,
      });

      await event.save();

      // Update user's eventsCreated array
      await User.findByIdAndUpdate(
        creatorId,
        { $push: { eventsCreated: event._id } },
        { new: true }
      );

      logger.info(`Event created: ${event.title} by user ${creatorId}`);
      return event;
    } catch (error: any) {
      logger.error(`Create event error: ${error.message}`);
      throw error;
    }
  }

  async getEventById(eventId: string, incrementViews: boolean = false): Promise<IEvent | null> {
    try {
      const event = await Event.findById(eventId)
        .populate('creator', 'name email profileImage')
        .lean();

      if (!event) {
        return null;
      }

      // Increment views if requested
      if (incrementViews) {
        await Event.findByIdAndUpdate(eventId, { $inc: { views: 1 } });
      }

      return event as IEvent;
    } catch (error: any) {
      logger.error(`Get event by ID error: ${error.message}`);
      throw error;
    }
  }

  async updateEvent(eventId: string, updates: IEventUpdate, creatorId: string): Promise<IEvent | null> {
    try {
      const event = await Event.findOne({ _id: eventId, creator: creatorId });

      if (!event) {
        return null;
      }

      // If totalTickets is being updated, adjust availableTickets
      if (updates.totalTickets !== undefined) {
        const ticketsSold = event.totalTickets - event.availableTickets;
        updates.availableTickets = Math.max(0, updates.totalTickets - ticketsSold);
      }

      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('creator', 'name email profileImage');

      logger.info(`Event updated: ${eventId} by user ${creatorId}`);
      return updatedEvent;
    } catch (error: any) {
      logger.error(`Update event error: ${error.message}`);
      throw error;
    }
  }

  async deleteEvent(eventId: string, creatorId: string): Promise<boolean> {
    try {
      const event = await Event.findOne({ _id: eventId, creator: creatorId });

      if (!event) {
        return false;
      }

      // Delete associated images
      event.images.forEach(image => {
        deleteFile(image);
      });

      // Delete the event
      await event.deleteOne();

      // Remove event from user's eventsCreated array
      await User.findByIdAndUpdate(
        creatorId,
        { $pull: { eventsCreated: eventId } }
      );

      logger.info(`Event deleted: ${eventId} by user ${creatorId}`);
      return true;
    } catch (error: any) {
      logger.error(`Delete event error: ${error.message}`);
      throw error;
    }
  }

  async getEvents(filter: IEventFilter, page: number = 1, limit: number = 10) {
    try {
      const query: any = {};

      // Apply filters
      if (filter.category) {
        query.category = filter.category;
      }

      if (filter.tags && filter.tags.length > 0) {
        query.tags = { $in: filter.tags };
      }

      if (filter.dateFrom || filter.dateTo) {
        query.date = {};
        if (filter.dateFrom) query.date.$gte = new Date(filter.dateFrom);
        if (filter.dateTo) query.date.$lte = new Date(filter.dateTo);
      }

      if (filter.priceMin !== undefined || filter.priceMax !== undefined) {
        query.ticketPrice = {};
        if (filter.priceMin !== undefined) query.ticketPrice.$gte = filter.priceMin;
        if (filter.priceMax !== undefined) query.ticketPrice.$lte = filter.priceMax;
      }

      if (filter.status) {
        query.status = filter.status;
      } else {
        // Default to published events for public queries
        query.status = 'published';
      }

      if (filter.visibility) {
        query.visibility = filter.visibility;
      } else {
        // Default to public events for public queries
        query.visibility = 'public';
      }

      if (filter.creator) {
        query.creator = filter.creator;
      }

      // Text search
      if (filter.search) {
        query.$text = { $search: filter.search };
      }

      // Sort
      const sort: any = {};
      const sortBy = filter.sortBy || 'date';
      const sortOrder = filter.sortOrder === 'desc' ? -1 : 1;
      sort[sortBy] = sortOrder;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      
      const [events, total] = await Promise.all([
        Event.find(query)
          .populate('creator', 'name email profileImage')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Event.countDocuments(query)
      ]);

      return {
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
      };
    } catch (error: any) {
      logger.error(`Get events error: ${error.message}`);
      throw error;
    }
  }

  async getEventsByCreator(creatorId: string, page: number = 1, limit: number = 10) {
    try {
      const [events, total] = await Promise.all([
        Event.find({ creator: creatorId })
          .populate('creator', 'name email profileImage')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Event.countDocuments({ creator: creatorId })
      ]);

      return {
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
      };
    } catch (error: any) {
      logger.error(`Get events by creator error: ${error.message}`);
      throw error;
    }
  }

  async addEventImages(eventId: string, creatorId: string, imageFiles: Express.Multer.File[]): Promise<IEvent | null> {
    try {
      const event = await Event.findOne({ _id: eventId, creator: creatorId });

      if (!event) {
        return null;
      }

      // Add new images
      const newImages = imageFiles.map(file => file.filename);
      event.images.push(...newImages);

      await event.save();

      logger.info(`Added ${newImages.length} images to event: ${eventId}`);
      return event.populate('creator', 'name email profileImage');
    } catch (error: any) {
      logger.error(`Add event images error: ${error.message}`);
      throw error;
    }
  }

  async removeEventImage(eventId: string, creatorId: string, imageFilename: string): Promise<IEvent | null> {
    try {
      const event = await Event.findOne({ _id: eventId, creator: creatorId });

      if (!event) {
        return null;
      }

      // Remove image from array
      const imageIndex = event.images.indexOf(imageFilename);
      if (imageIndex > -1) {
        event.images.splice(imageIndex, 1);
        deleteFile(imageFilename);
        await event.save();
      }

      logger.info(`Removed image from event: ${eventId}`);
      return event.populate('creator', 'name email profileImage');
    } catch (error: any) {
      logger.error(`Remove event image error: ${error.message}`);
      throw error;
    }
  }

  async incrementEventShares(eventId: string): Promise<IEvent | null> {
    try {
      const event = await Event.findByIdAndUpdate(
        eventId,
        { $inc: { shareCount: 1 } },
        { new: true }
      ).populate('creator', 'name email profileImage');

      return event;
    } catch (error: any) {
      logger.error(`Increment event shares error: ${error.message}`);
      throw error;
    }
  }

  async getEventShareUrl(eventId: string): Promise<any | null> { // Changed return type from string to any
    try {
      const event = await Event.findById(eventId).lean();
      
      if (!event) {
        return null;
      }

      const baseUrl = process.env.FRONTEND_URL || process.env.API_BASE_URL || 'http://localhost:3000';
      const shareUrl = `${baseUrl}/events/${eventId}`;
      
      // Generate social media sharing URLs
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedTitle = encodeURIComponent(event.title);
      const encodedDescription = encodeURIComponent(event.description.substring(0, 100));

      return {
        directUrl: shareUrl,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
        whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
      };
    } catch (error: any) {
      logger.error(`Get event share URL error: ${error.message}`);
      throw error;
    }
  }
}

export const eventService = new EventService();