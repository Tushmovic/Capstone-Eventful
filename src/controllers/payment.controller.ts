import { Request, Response } from 'express';
import { paystackService } from '../services/paystack/paystack.service';
import { ticketService } from '../services/ticket.service';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { clearCache } from '../middlewares/cache.middleware';
import Payment from '../models/Payment.model';

export class PaymentController {
  async handleWebhook(req: Request, res: Response) {
    try {
      // Verify webhook signature (in production)
      const signature = req.headers['x-paystack-signature'] as string;
      const isValid = await paystackService.verifyWebhookSignature(req.body, signature);
      
      if (!isValid) {
        logger.warn('Invalid webhook signature received');
        return res.status(401).send('Invalid signature');
      }

      const eventData = req.body;
      
      // Handle the webhook event
      const result = await paystackService.handleWebhook(eventData);
      
      if (result.success && eventData.event === 'charge.success') {
        const { reference } = result.data;
        
        // Verify and process the payment
        const paymentResult = await ticketService.verifyPayment(reference);
        
        if (paymentResult.success && paymentResult.ticket) {
          // Update payment record
          await Payment.findOneAndUpdate(
            { reference },
            { 
              status: 'successful',
              paystackData: eventData.data,
              updatedAt: new Date(),
            }
          );

          // Clear relevant caches
          await clearCache(`payment:${reference}`);
          await clearCache(`event:${paymentResult.ticket.event._id}:tickets`);
          await clearCache(`user:${paymentResult.ticket.user._id}:tickets`);

          logger.info(`Webhook processed successfully: ${reference}`);
        }
      }

      // Always return 200 to Paystack
      res.status(200).send('Webhook received');
    } catch (error: any) {
      logger.error(`Payment webhook error: ${error.message}`);
      // Still return 200 to prevent Paystack retries
      res.status(200).send('Webhook received');
    }
  }

  async getPaymentDetails(req: Request, res: Response) {
    try {
      const { reference } = req.params;
      const userId = (req as any).user.userId;

      const payment = await Payment.findOne({ reference, userId })
        .populate('eventId', 'title date location')
        .populate('ticketId', 'ticketNumber status')
        .populate('userId', 'name email');

      if (!payment) {
        return ApiResponse.notFound(res, 'Payment not found');
      }

      return ApiResponse.success(res, payment, 'Payment details retrieved successfully');
    } catch (error: any) {
      logger.error(`Get payment details error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get payment details');
    }
  }

  async getMyPayments(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;

      const payments = await Payment.find({ userId })
        .populate('eventId', 'title date')
        .populate('ticketId', 'ticketNumber')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      const total = await Payment.countDocuments({ userId });

      return ApiResponse.success(res, {
        payments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      }, 'Payments retrieved successfully');
    } catch (error: any) {
      logger.error(`Get my payments error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get payments');
    }
  }

  async getEventPayments(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const userId = (req as any).user.userId;

      // Verify user is event creator
      const Event = require('../models/Event.model').default;
      const event = await Event.findOne({ _id: eventId, creator: userId });
      
      if (!event) {
        return ApiResponse.forbidden(res, 'You are not the creator of this event');
      }

      const payments = await Payment.find({ eventId })
        .populate('userId', 'name email')
        .populate('ticketId', 'ticketNumber status')
        .sort({ createdAt: -1 });

      // Calculate totals
      const successfulPayments = payments.filter(p => p.status === 'successful');
      const totalRevenue = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);

      return ApiResponse.success(res, {
        event: {
          title: event.title,
          totalTickets: event.totalTickets,
          availableTickets: event.availableTickets,
        },
        payments,
        summary: {
          totalPayments: payments.length,
          successfulPayments: successfulPayments.length,
          failedPayments: payments.filter(p => p.status === 'failed').length,
          totalRevenue,
          averageTicketPrice: successfulPayments.length > 0 
            ? totalRevenue / successfulPayments.length 
            : 0,
        },
      }, 'Event payments retrieved successfully');
    } catch (error: any) {
      logger.error(`Get event payments error: ${error.message}`);
      return ApiResponse.error(res, 'Failed to get event payments');
    }
  }
}

export const paymentController = new PaymentController();