import Ticket from '../models/Ticket.model';
import Event from '../models/Event.model';
import User from '../models/User.model';
import Payment from '../models/Payment.model';
import { ITicket, IPurchaseTicketInput, ICreateTicketInput, IVerifyTicketResponse } from '../interfaces/ticket.interface';
import { qrCodeService } from './qrcode/qrcode.service';
import { paystackService } from './paystack/paystack.service';
import { logger } from '../utils/logger';
import { emailService } from '../config/email';
import { redisClient } from '../config/redis';

export class TicketService {
  async purchaseTicket(purchaseData: IPurchaseTicketInput): Promise<{ 
    paymentUrl: string; 
    reference: string; 
    amount: number;
  }> {
    try {
      const { eventId, quantity, userId } = purchaseData;

      // Get event details
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Check if event is published
      if (event.status !== 'published') {
        throw new Error('Event is not available for ticket purchase');
      }

      // Check ticket availability
      if (event.availableTickets < quantity) {
        throw new Error(`Only ${event.availableTickets} tickets available`);
      }

      // Get user details
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate total amount
      const totalAmount = event.ticketPrice * quantity;

      // Initialize payment with Paystack
      const paymentData = await paystackService.initializeTransaction(
        user.email,
        totalAmount,
        {
          eventId: event._id.toString(),
          eventTitle: event.title,
          userId: user._id.toString(),
          userName: user.name,
          quantity,
          ticketPrice: event.ticketPrice,
          totalAmount,
        }
      );

      // FIX: Use set with EX option if available, otherwise use setex
      const redisValue = JSON.stringify({
        eventId,
        userId,
        quantity,
        totalAmount,
        status: 'pending',
        createdAt: new Date(),
      });

      // Try different Redis methods
      try {
        // Method 1: Try set with options
        await (redisClient as any).set(`payment:${paymentData.reference}`, redisValue, 'EX', 3600);
      } catch {
        try {
          // Method 2: Try setex
          await (redisClient as any).setex(`payment:${paymentData.reference}`, 3600, redisValue);
        } catch {
          // Method 3: Just set without expiry
          await redisClient.set(`payment:${paymentData.reference}`, redisValue);
        }
      }

      logger.info(`Payment initialized for event ${eventId} by user ${userId}`);
      
      return {
        paymentUrl: paymentData.authorization_url,
        reference: paymentData.reference,
        amount: totalAmount,
      };
    } catch (error: any) {
      logger.error(`Ticket purchase error: ${error.message}`);
      throw error;
    }
  }

  async createTicket(ticketData: ICreateTicketInput): Promise<ITicket> {
    try {
      const { eventId, userId, ticketNumber, price, paymentReference } = ticketData;

      // Generate QR code
      const { qrCodeData, qrCodeUrl } = await qrCodeService.generateTicketQRCode(
        ticketNumber,
        `ticket-${ticketNumber}`
      );

      // Create ticket
      const ticket = new Ticket({
        ticketNumber,
        event: eventId,
        user: userId,
        price,
        qrCode: qrCodeUrl,
        paymentReference,
        paymentStatus: 'successful',
        status: 'confirmed',
        purchaseDate: new Date(),
      });

      await ticket.save();

      // Update user's ticketsBought array
      await User.findByIdAndUpdate(
        userId,
        { $push: { ticketsBought: ticket._id } },
        { new: true }
      );

      // Update event's available tickets
      await Event.findByIdAndUpdate(
        eventId,
        { $inc: { availableTickets: -1 } },
        { new: true }
      );

      // Create payment record
      await this.createPaymentRecord(ticket, paymentReference);

      // Clear cache
      await redisClient.del(`event:${eventId}`);
      await redisClient.del(`user:${userId}:tickets`);

      // Send confirmation email
      await this.sendTicketConfirmation(ticket);

      logger.info(`Ticket created: ${ticketNumber} for event ${eventId}`);
      return ticket.populate(['event', 'user']);
    } catch (error: any) {
      logger.error(`Create ticket error: ${error.message}`);
      throw error;
    }
  }

  async verifyPayment(reference: string): Promise<{ 
    success: boolean; 
    ticket?: ITicket; 
    message: string;
  }> {
    try {
      // Check Redis for payment intent
      const paymentIntent = await redisClient.get(`payment:${reference}`);
      if (!paymentIntent) {
        throw new Error('Payment session expired or not found');
      }

      const paymentIntentData = JSON.parse(paymentIntent);

      // Verify payment with Paystack
      const paymentData = await paystackService.verifyTransaction(reference);

      // FIX: Type assertion to access any property
      const paystackData = paymentData as any;
      
      if (paystackData.status !== 'success') {
        // Use any to bypass TypeScript checking for now
        const errorMsg = (paystackData as any).gateway_response || 
                        (paystackData as any).message || 
                        'Payment failed';
        throw new Error(`Payment failed: ${errorMsg}`);
      }

      // Create ticket
      const ticketNumber = qrCodeService.generateTicketNumber();
      const ticket = await this.createTicket({
        eventId: paymentIntentData.eventId,
        userId: paymentIntentData.userId,
        ticketNumber,
        price: paymentIntentData.totalAmount / paymentIntentData.quantity,
        paymentReference: reference,
      });

      // Clear payment intent from Redis
      await redisClient.del(`payment:${reference}`);

      logger.info(`Payment verified and ticket created: ${reference}`);
      
      return {
        success: true,
        ticket,
        message: 'Payment successful and ticket created',
      };
    } catch (error: any) {
      logger.error(`Verify payment error: ${error.message}`);
      
      // Update payment intent status in Redis
      try {
        const paymentIntent = await redisClient.get(`payment:${reference}`);
        if (paymentIntent) {
          const paymentIntentData = JSON.parse(paymentIntent);
          const redisValue = JSON.stringify({
            ...paymentIntentData,
            status: 'failed',
            error: error.message,
          });
          
          // Try different Redis methods
          try {
            await (redisClient as any).set(`payment:${reference}`, redisValue, 'EX', 3600);
          } catch {
            try {
              await (redisClient as any).setex(`payment:${reference}`, 3600, redisValue);
            } catch {
              await redisClient.set(`payment:${reference}`, redisValue);
            }
          }
        }
      } catch (redisError: any) {
        logger.error(`Redis update error: ${redisError.message}`);
      }

      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verifyTicket(ticketNumberOrCode: string): Promise<IVerifyTicketResponse> {
    try {
      // Try to find by ticket number
      let ticket = await Ticket.findOne({ ticketNumber: ticketNumberOrCode })
        .populate('event')
        .populate('user', 'name email profileImage');

      // If not found, try to decode QR code data
      if (!ticket) {
        try {
          const qrData = qrCodeService.decodeQRCodeData(ticketNumberOrCode);
          ticket = await Ticket.findById(qrData.ticketId)
            .populate('event')
            .populate('user', 'name email profileImage');
        } catch (error) {
          // Not a valid QR code either
        }
      }

      if (!ticket) {
        return {
          isValid: false,
          ticket: null as any,
          event: null as any,
          user: null as any,
          message: 'Invalid ticket code',
        };
      }

      // Check if ticket is valid
      const now = new Date();
      const eventDate = (ticket.event as any)?.date || new Date();

      if (ticket.status === 'used') {
        return {
          isValid: false,
          ticket,
          event: ticket.event as any,
          user: ticket.user as any,
          message: 'Ticket has already been used',
        };
      }

      if (ticket.status === 'cancelled') {
        return {
          isValid: false,
          ticket,
          event: ticket.event as any,
          user: ticket.user as any,
          message: 'Ticket has been cancelled',
        };
      }

      if (ticket.status === 'expired') {
        return {
          isValid: false,
          ticket,
          event: ticket.event as any,
          user: ticket.user as any,
          message: 'Ticket has expired',
        };
      }

      if (new Date(eventDate) < now) {
        ticket.status = 'expired';
        await ticket.save();
        
        return {
          isValid: false,
          ticket,
          event: ticket.event as any,
          user: ticket.user as any,
          message: 'Event has already passed',
        };
      }

      if (ticket.paymentStatus !== 'successful') {
        return {
          isValid: false,
          ticket,
          event: ticket.event as any,
          user: ticket.user as any,
          message: 'Payment not completed',
        };
      }

      // Mark ticket as used if it's a verification scan
      if (ticket.status === 'confirmed') {
        ticket.status = 'used';
        ticket.usedAt = new Date();
        await ticket.save();
      }

      logger.info(`Ticket verified: ${ticketNumberOrCode}`);
      
      return {
        isValid: true,
        ticket,
        event: ticket.event as any,
        user: ticket.user as any,
        message: 'Valid ticket',
      };
    } catch (error: any) {
      logger.error(`Verify ticket error: ${error.message}`);
      throw error;
    }
  }

  async getUserTickets(userId: string): Promise<ITicket[]> {
    try {
      const cacheKey = `user:${userId}:tickets`;
      
      // Try to get from cache
      const cachedTickets = await redisClient.get(cacheKey);
      if (cachedTickets) {
        return JSON.parse(cachedTickets);
      }

      const tickets = await Ticket.find({ user: userId })
        .populate('event')
        .sort({ purchaseDate: -1 });

      // FIX: Redis caching with expiry
      const redisValue = JSON.stringify(tickets);
      
      // Try different Redis methods
      try {
        await (redisClient as any).set(cacheKey, redisValue, 'EX', 300);
      } catch {
        try {
          await (redisClient as any).setex(cacheKey, 300, redisValue);
        } catch {
          await redisClient.set(cacheKey, redisValue);
        }
      }

      return tickets;
    } catch (error: any) {
      logger.error(`Get user tickets error: ${error.message}`);
      throw error;
    }
  }

  async getEventTickets(eventId: string): Promise<ITicket[]> {
    try {
      const cacheKey = `event:${eventId}:tickets`;
      
      // Try to get from cache
      const cachedTickets = await redisClient.get(cacheKey);
      if (cachedTickets) {
        return JSON.parse(cachedTickets);
      }

      const tickets = await Ticket.find({ event: eventId })
        .populate('user', 'name email profileImage')
        .sort({ purchaseDate: -1 });

      // FIX: Redis caching with expiry
      const redisValue = JSON.stringify(tickets);
      
      // Try different Redis methods
      try {
        await (redisClient as any).set(cacheKey, redisValue, 'EX', 300);
      } catch {
        try {
          await (redisClient as any).setex(cacheKey, 300, redisValue);
        } catch {
          await redisClient.set(cacheKey, redisValue);
        }
      }

      return tickets;
    } catch (error: any) {
      logger.error(`Get event tickets error: ${error.message}`);
      throw error;
    }
  }

  async cancelTicket(ticketId: string, userId: string): Promise<ITicket> {
    try {
      const ticket = await Ticket.findOne({ _id: ticketId, user: userId });
      
      if (!ticket) {
        throw new Error('Ticket not found or you do not have permission');
      }

      if (ticket.status === 'used') {
        throw new Error('Cannot cancel a used ticket');
      }

      if (ticket.status === 'cancelled') {
        throw new Error('Ticket is already cancelled');
      }

      // Check if event date is in the future
      const event = await Event.findById(ticket.event);
      if (event && event.date < new Date()) {
        throw new Error('Cannot cancel ticket for past event');
      }

      ticket.status = 'cancelled';
      await ticket.save();

      // Update event's available tickets
      await Event.findByIdAndUpdate(
        ticket.event,
        { $inc: { availableTickets: 1 } },
        { new: true }
      );

      // Clear cache
      await redisClient.del(`event:${ticket.event}:tickets`);
      await redisClient.del(`user:${userId}:tickets`);
      await redisClient.del(`event:${ticket.event}`);

      logger.info(`Ticket cancelled: ${ticketId} by user ${userId}`);
      return ticket.populate(['event', 'user']);
    } catch (error: any) {
      logger.error(`Cancel ticket error: ${error.message}`);
      throw error;
    }
  }

  private async createPaymentRecord(ticket: ITicket, reference: string): Promise<void> {
    try {
      const payment = new Payment({
        reference,
        userId: ticket.user,
        eventId: ticket.event,
        ticketId: ticket._id,
        amount: ticket.price,
        status: 'successful',
        paystackData: {}, // Store full Paystack response if needed
      });

      await payment.save();
    } catch (error: any) {
      logger.error(`Create payment record error: ${error.message}`);
      throw error;
    }
  }

  private async sendTicketConfirmation(ticket: ITicket): Promise<void> {
    try {
      const event = await Event.findById(ticket.event);
      const user = await User.findById(ticket.user);

      if (!event || !user) {
        return;
      }

      await emailService.sendTicketConfirmation(
        user.email,
        event.title,
        ticket.ticketNumber,
        ticket.qrCode
      );
    } catch (error: any) {
      logger.error(`Send ticket confirmation error: ${error.message}`);
      // Don't throw - email failure shouldn't block ticket creation
    }
  }
}

export const ticketService = new TicketService();