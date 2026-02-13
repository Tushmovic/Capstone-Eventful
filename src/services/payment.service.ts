import { paystackService } from '../config/paystack';
import Payment from '../models/Payment.model';
import { logger } from '../utils/logger';

export class PaymentService {
  async createPaymentIntent(data: {
    userId: string;
    eventId: string;
    amount: number;
    email: string;
    quantity: number;
  }) {
    try {
      // ✅ FIX: Call Paystack with correct parameter order - (email, amount, metadata, reference?)
      const paymentData = await paystackService.initializeTransaction(
        data.email,
        data.amount,
        { // Metadata as second parameter
          userId: data.userId,
          eventId: data.eventId,
          quantity: data.quantity,
          type: 'ticket_purchase',
        }
        // No reference - let Paystack generate it
      );

      const paystackReference = paymentData.reference;

      // Save payment intent with Paystack's reference
      const payment = new Payment({
        reference: paystackReference,
        userId: data.userId,
        eventId: data.eventId,
        amount: data.amount,
        status: 'pending',
        metadata: {
          email: data.email,
          quantity: data.quantity,
        },
      });

      await payment.save();

      return {
        paymentUrl: paymentData.authorization_url,
        reference: paystackReference,
        accessCode: paymentData.access_code,
      };
    } catch (error: any) {
      logger.error(`Create payment intent error: ${error.message}`);
      throw error;
    }
  }

  async verifyAndCompletePayment(reference: string) {
    try {
      const payment = await Payment.findOne({ reference });
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'successful') {
        return { success: true, payment };
      }

      // Verify with Paystack
      const paystackData = await paystackService.verifyTransaction(reference);
      
      const data = paystackData as any;
      
      if (data.status === 'success') {
        payment.status = 'successful';
        payment.paystackData = data;
        await payment.save();

        return { success: true, payment };
      } else {
        payment.status = 'failed';
        await payment.save();
        
        return { success: false, payment };
      }
    } catch (error: any) {
      logger.error(`Verify payment error: ${error.message}`);
      throw error;
    }
  }

  async getEventPayments(eventId: string, userId: string) {
    try {
      // Verify user owns the event
      const Event = require('../models/Event.model').default;
      const event = await Event.findOne({ _id: eventId, creator: userId });
      
      if (!event) {
        throw new Error('Event not found or unauthorized');
      }

      const payments = await Payment.find({ eventId })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });

      return payments;
    } catch (error: any) {
      logger.error(`Get event payments error: ${error.message}`);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();