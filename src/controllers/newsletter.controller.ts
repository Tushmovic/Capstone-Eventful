import { Request, Response } from 'express';
import Newsletter from '../models/Newsletter.model';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { emailService } from '../config/email';

export class NewsletterController {
  async subscribe(req: Request, res: Response) {
    try {
      const { email } = req.body;

      // Check if already subscribed
      let subscriber = await Newsletter.findOne({ email });

      if (subscriber) {
        if (subscriber.status === 'active') {
          return ApiResponse.success(res, null, 'Email already subscribed');
        } else {
          // Reactivate unsubscribed
          subscriber.status = 'active';
          await subscriber.save();
          return ApiResponse.success(res, null, 'Subscription reactivated');
        }
      }

      // Create new subscriber
      subscriber = await Newsletter.create({ email });

      // Send welcome email
      await emailService.sendEmail(
        email,
        'Welcome to Alaya Eventful Newsletter!',
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: var(--earth-700);">Welcome to Alaya Eventful! 🎭</h2>
          <p>Thank you for subscribing to our newsletter. You'll receive updates about:</p>
          <ul>
            <li>Upcoming Islamic events</li>
            <li>Special announcements</li>
            <li>Community news</li>
          </ul>
          <p>Stay tuned for exciting events!</p>
        </div>
        `
      );

      logger.info(`📧 New newsletter subscriber: ${email}`);
      return ApiResponse.success(res, null, 'Successfully subscribed to newsletter');
    } catch (error: any) {
      logger.error(`Newsletter subscription error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to subscribe');
    }
  }

  async unsubscribe(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const subscriber = await Newsletter.findOne({ email });
      
      if (!subscriber) {
        return ApiResponse.notFound(res, 'Email not found');
      }

      subscriber.status = 'unsubscribed';
      await subscriber.save();

      logger.info(`📧 Unsubscribed: ${email}`);
      return ApiResponse.success(res, null, 'Successfully unsubscribed');
    } catch (error: any) {
      logger.error(`Unsubscribe error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to unsubscribe');
    }
  }

  async getSubscribers(req: Request, res: Response) {
    try {
      const subscribers = await Newsletter.find({ status: 'active' }).sort({ subscribedAt: -1 });
      return ApiResponse.success(res, subscribers, 'Subscribers retrieved');
    } catch (error: any) {
      logger.error(`Get subscribers error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get subscribers');
    }
  }
}

export const newsletterController = new NewsletterController();