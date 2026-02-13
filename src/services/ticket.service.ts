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

      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.status !== 'published') {
        throw new Error('Event is not available for ticket purchase');
      }

      if (event.availableTickets < quantity) {
        throw new Error(`Only ${event.availableTickets} tickets available`);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const totalAmount = event.ticketPrice * quantity;

      // 🔥 FIX: Let Paystack generate the reference - don't create your own
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

      const paystackReference = paymentData.reference;

      // Store payment intent in Redis using Paystack's reference
      const redisValue = JSON.stringify({
        eventId: event._id.toString(),
        userId: userId.toString(),
        quantity,
        totalAmount,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      await redisClient.set(`payment:${paystackReference}`, redisValue);
      logger.info(`✅ Payment intent stored in Redis: ${paystackReference}`);

      logger.info(`✅ Payment initialized for event ${eventId} by user ${userId}, ref: ${paystackReference}`);
      
      return {
        paymentUrl: paymentData.authorization_url,
        reference: paystackReference,
        amount: totalAmount,
      };
    } catch (error: any) {
      logger.error(`❌ Ticket purchase error: ${error.message}`);
      throw error;
    }
  }

  // ============= REST OF METHODS (EXACTLY THE SAME) =============

  async verifyPayment(reference: string): Promise<{ 
    success: boolean; 
    ticket?: ITicket; 
    message: string;
  }> {
    try {
      logger.info(`🔍 Verifying payment: ${reference}`);

      const paymentIntent = await redisClient.get(`payment:${reference}`);
      
      if (!paymentIntent) {
        logger.error(`❌ Payment session not found in Redis: ${reference}`);
        return {
          success: false,
          message: 'Payment session expired or not found. Please try purchasing again.',
        };
      }

      const paymentIntentData = JSON.parse(paymentIntent);
      logger.info(`✅ Found payment intent in Redis: ${reference}`);

      const paymentData = await paystackService.verifyTransaction(reference);
      
      if (paymentData.status !== 'success') {
        const gatewayResponse = (paymentData as any).gateway_response;
        throw new Error(`Payment verification failed: ${gatewayResponse || 'Unknown error'}`);
      }

      const ticketNumber = qrCodeService.generateTicketNumber();
      const ticket = await this.createTicket({
        eventId: paymentIntentData.eventId,
        userId: paymentIntentData.userId,
        ticketNumber,
        price: paymentIntentData.totalAmount / paymentIntentData.quantity,
        paymentReference: reference,
      });

      await redisClient.del(`payment:${reference}`);
      logger.info(`✅ Payment verified and ticket created: ${reference}`);

      return {
        success: true,
        ticket,
        message: 'Payment successful and ticket created',
      };
    } catch (error: any) {
      logger.error(`❌ Verify payment error: ${error.message}`);
      return {
        success: false,
        message: error.message || 'Payment verification failed',
      };
    }
  }

  async createTicket(ticketData: ICreateTicketInput): Promise<ITicket> {
    try {
      const { eventId, userId, ticketNumber, price, paymentReference } = ticketData;

      const { qrCodeUrl } = await qrCodeService.generateTicketQRCode(
        ticketNumber,
        `ticket-${ticketNumber}`
      );

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

      await User.findByIdAndUpdate(
        userId,
        { $push: { ticketsBought: ticket._id } },
        { new: true }
      );

      await Event.findByIdAndUpdate(
        eventId,
        { $inc: { availableTickets: -1 } },
        { new: true }
      );

      await this.createPaymentRecord(ticket, paymentReference);

      await redisClient.del(`event:${eventId}`);
      await redisClient.del(`user:${userId}:tickets`);

      this.sendTicketConfirmation(ticket).catch(err => 
        logger.error(`Failed to send email: ${err.message}`)
      );

      logger.info(`✅ Ticket created: ${ticketNumber} for event ${eventId}`);
      return ticket.populate(['event', 'user']);
    } catch (error: any) {
      logger.error(`❌ Create ticket error: ${error.message}`);
      throw error;
    }
  }

  async verifyTicket(ticketNumberOrCode: string): Promise<IVerifyTicketResponse> {
    try {
      let ticket = await Ticket.findOne({ ticketNumber: ticketNumberOrCode })
        .populate('event')
        .populate('user', 'name email profileImage');

      if (!ticket) {
        try {
          const qrData = qrCodeService.decodeQRCodeData(ticketNumberOrCode);
          ticket = await Ticket.findById(qrData.ticketId)
            .populate('event')
            .populate('user', 'name email profileImage');
        } catch (error) {
          // Not a valid QR code
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

      if (ticket.status === 'expired' || new Date(eventDate) < now) {
        ticket.status = 'expired';
        await ticket.save();
        return {
          isValid: false,
          ticket,
          event: ticket.event as any,
          user: ticket.user as any,
          message: 'Ticket has expired',
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

      if (ticket.status === 'confirmed') {
        ticket.status = 'used';
        ticket.usedAt = new Date();
        await ticket.save();
      }

      logger.info(`✅ Ticket verified: ${ticketNumberOrCode}`);
      
      return {
        isValid: true,
        ticket,
        event: ticket.event as any,
        user: ticket.user as any,
        message: 'Valid ticket',
      };
    } catch (error: any) {
      logger.error(`❌ Verify ticket error: ${error.message}`);
      throw error;
    }
  }

  async getUserTickets(userId: string): Promise<ITicket[]> {
    try {
      const cacheKey = `user:${userId}:tickets`;
      
      const cachedTickets = await redisClient.get(cacheKey);
      if (cachedTickets) {
        return JSON.parse(cachedTickets);
      }

      const tickets = await Ticket.find({ user: userId })
        .populate('event')
        .sort({ purchaseDate: -1 });

      await redisClient.set(cacheKey, JSON.stringify(tickets));
      return tickets;
    } catch (error: any) {
      logger.error(`❌ Get user tickets error: ${error.message}`);
      throw error;
    }
  }

  async getEventTickets(eventId: string): Promise<ITicket[]> {
    try {
      const cacheKey = `event:${eventId}:tickets`;
      
      const cachedTickets = await redisClient.get(cacheKey);
      if (cachedTickets) {
        return JSON.parse(cachedTickets);
      }

      const tickets = await Ticket.find({ event: eventId })
        .populate('user', 'name email profileImage')
        .sort({ purchaseDate: -1 });

      await redisClient.set(cacheKey, JSON.stringify(tickets));
      return tickets;
    } catch (error: any) {
      logger.error(`❌ Get event tickets error: ${error.message}`);
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

      const event = await Event.findById(ticket.event);
      if (event && event.date < new Date()) {
        throw new Error('Cannot cancel ticket for past event');
      }

      ticket.status = 'cancelled';
      await ticket.save();

      await Event.findByIdAndUpdate(
        ticket.event,
        { $inc: { availableTickets: 1 } },
        { new: true }
      );

      await redisClient.del(`event:${ticket.event}:tickets`);
      await redisClient.del(`user:${userId}:tickets`);
      await redisClient.del(`event:${ticket.event}`);

      logger.info(`✅ Ticket cancelled: ${ticketId} by user ${userId}`);
      return ticket.populate(['event', 'user']);
    } catch (error: any) {
      logger.error(`❌ Cancel ticket error: ${error.message}`);
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
        paystackData: {},
      });

      await payment.save();
    } catch (error: any) {
      logger.error(`❌ Create payment record error: ${error.message}`);
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
      logger.error(`❌ Send ticket confirmation error: ${error.message}`);
    }
  }
}

export const ticketService = new TicketService();