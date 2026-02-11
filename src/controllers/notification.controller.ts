import { Request, Response } from 'express';
import { notificationService } from '../services/notifications/notification.service';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';

export class NotificationController {
  async setReminder(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { eventId, reminderType, customTime } = req.body;

      const result = await notificationService.setEventReminder(
        userId,
        eventId,
        reminderType,
        customTime ? new Date(customTime) : undefined
      );

      if (!result) {
        return ApiResponse.error(res, 'Failed to set reminder');
      }

      return ApiResponse.success(res, null, 'Reminder set successfully');
    } catch (error: any) {
      logger.error(`Set reminder error: ${error.message}`);
      return ApiResponse.error(res, error.message || 'Failed to set reminder');
    }
  }

  async getMyReminders(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const reminders = await notificationService.getUserReminders(userId);

      // Enrich with event details
      const enrichedReminders = await Promise.all(
        reminders.map(async (reminder) => {
          const Event = require('../models/Event.model').default;
          const event = await Event.findById(reminder.eventId).select('title date location');
          return {
            ...reminder,
            eventDetails: event
          };
        })
      );

      return ApiResponse.success(res, enrichedReminders, 'Reminders retrieved successfully');
    } catch (error: any) {
      logger.error(`Get reminders error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get reminders');
    }
  }

  async deleteReminder(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { eventId } = req.params;

      const result = await notificationService.deleteReminder(userId, eventId);

      if (!result) {
        return ApiResponse.error(res, 'Failed to delete reminder');
      }

      return ApiResponse.success(res, null, 'Reminder deleted successfully');
    } catch (error: any) {
      logger.error(`Delete reminder error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to delete reminder');
    }
  }

  async getNotificationPreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const User = require('../models/User.model').default;
      
      const user = await User.findById(userId).select('notificationPreferences');
      
      return ApiResponse.success(
        res, 
        user?.notificationPreferences || { email: true, sms: false, push: true },
        'Preferences retrieved successfully'
      );
    } catch (error: any) {
      logger.error(`Get preferences error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get preferences');
    }
  }

  async updateNotificationPreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { email, sms, push } = req.body;

      const User = require('../models/User.model').default;
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          notificationPreferences: { 
            email: email ?? true, 
            sms: sms ?? false, 
            push: push ?? true 
          } 
        },
        { new: true }
      );

      return ApiResponse.success(
        res, 
        user?.notificationPreferences,
        'Preferences updated successfully'
      );
    } catch (error: any) {
      logger.error(`Update preferences error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to update preferences');
    }
  }
}

export const notificationController = new NotificationController();