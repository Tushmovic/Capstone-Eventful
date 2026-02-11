import User from '../../models/User.model';
import Event from '../../models/Event.model';
import Ticket from '../../models/Ticket.model';
import { emailService } from '../../config/email';
import { logger } from '../../utils/logger';
import { redisClient } from '../../config/redis';

export interface IReminder {
  userId: string;
  eventId: string;
  reminderTime: Date;
  type: '1h' | '1d' | '1w' | 'custom';
  sent: boolean;
}

export class NotificationService {
  private reminders: Map<string, IReminder[]> = new Map();

  async setEventReminder(
    userId: string,
    eventId: string,
    reminderType: '1h' | '1d' | '1w' | 'custom',
    customTime?: Date
  ): Promise<boolean> {
    try {
      const event = await Event.findById(eventId);
      const user = await User.findById(userId);
      
      if (!event || !user) {
        throw new Error('Event or user not found');
      }

      let reminderTime: Date;
      
      switch (reminderType) {
        case '1h':
          reminderTime = new Date(event.date.getTime() - 60 * 60 * 1000);
          break;
        case '1d':
          reminderTime = new Date(event.date.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '1w':
          reminderTime = new Date(event.date.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          if (!customTime) throw new Error('Custom time required');
          reminderTime = customTime;
          break;
      }

      const reminder: IReminder = {
        userId,
        eventId,
        reminderTime,
        type: reminderType,
        sent: false
      };

      // Store in Redis or memory
      const key = `reminder:${userId}:${eventId}`;
      await redisClient.set(key, reminder);
      
      logger.info(`✅ Reminder set for user ${userId} on event ${eventId}`);
      return true;
    } catch (error: any) {
      logger.error(`Set reminder error: ${error.message}`);
      return false;
    }
  }

  async getUserReminders(userId: string): Promise<IReminder[]> {
    try {
      const keys = await redisClient.getRawClient().sendCommand(['KEYS', `reminder:${userId}:*`]);
      const reminders: IReminder[] = [];
      
      for (const key of keys) {
        const reminder = await redisClient.get(key);
        if (reminder) reminders.push(reminder);
      }
      
      return reminders;
    } catch (error: any) {
      logger.error(`Get reminders error: ${error.message}`);
      return [];
    }
  }

  async deleteReminder(userId: string, eventId: string): Promise<boolean> {
    try {
      const key = `reminder:${userId}:${eventId}`;
      await redisClient.del(key);
      return true;
    } catch (error: any) {
      logger.error(`Delete reminder error: ${error.message}`);
      return false;
    }
  }

  async sendEventReminderEmail(
    userId: string,
    eventId: string,
    eventName: string,
    eventDate: Date,
    eventLocation: string,
    ticketId?: string
  ): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.email) return false;

      await emailService.sendEventReminder(
        user.email,
        eventName,
        eventDate,
        eventLocation,
        ticketId || 'N/A'
      );
      
      // Mark reminder as sent
      const key = `reminder:${userId}:${eventId}`;
      const reminder = await redisClient.get(key);
      if (reminder) {
        reminder.sent = true;
        await redisClient.set(key, reminder);
      }
      
      return true;
    } catch (error: any) {
      logger.error(`Send reminder email error: ${error.message}`);
      return false;
    }
  }
}

export const notificationService = new NotificationService();