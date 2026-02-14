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

      console.log('\n🔍 ========== TICKET PURCHASE DEBUG ==========');
      console.log('Step 0 - Purchase started:', { eventId, quantity, userId });

      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      console.log('🔍 Step 1 - Event from DB:', {
        id: event._id,
        title: event.title,
        ticketPrice: event.ticketPrice,
        inNaira: event.ticketPrice / 100,
        expectedNairaForDisplay: `₦${(event.ticketPrice / 100).toLocaleString()}`
      });

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

      console.log('🔍 Step 2 - User found:', {
        id: user._id,
        email: user.email,
        name: user.name
      });

      const totalAmountInKobo = event.ticketPrice * quantity;
      const nairaTotal = (event.ticketPrice / 100) * quantity;

      console.log('🔍 Step 3 - Amount calculations:', {
        ticketPriceInKobo: event.ticketPrice,
        ticketPriceInNaira: event.ticketPrice / 100,
        quantity,
        totalAmountInKobo,
        totalAmountInNaira: totalAmountInKobo / 100,
        nairaTotalForRedis: nairaTotal
      });

      const uniqueReference = `EVT_${Date.now()}_${userId.substring(0,5)}_${Math.random().toString(36).substring(2, 8)}`;

      console.log('🔍 Step 4 - Generated reference:', uniqueReference);
      console.log('🔍 Step 5 - Calling paystackService.initializeTransaction with:', {
        email: user.email,
        amount: totalAmountInKobo,
        amountInNaira: totalAmountInKobo / 100,
        expectedPaystackDisplay: `₦${(totalAmountInKobo / 100).toLocaleString()}`
      });

      const paymentData = await paystackService.initializeTransaction(
        user.email,
        totalAmountInKobo,
        {
          eventId: event._id.toString(),
          eventTitle: event.title,
          userId: user._id.toString(),
          userName: user.name,
          quantity,
          ticketPrice: event.ticketPrice,
          totalAmount: totalAmountInKobo,
          nairaTotal,
          uniqueReference,
          reference: uniqueReference,
        }
      );

      console.log('🔍 Step 6 - Paystack response:', {
        reference: paymentData.reference,
        authorization_url: paymentData.authorization_url,
        hasAccessCode: !!paymentData.access_code
      });

      const paystackReference = paymentData.reference;

      const redisValue = JSON.stringify({
        eventId: event._id.toString(),
        userId: userId.toString(),
        quantity,
        totalAmount: nairaTotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
        uniqueReference,
      });

      console.log('🔍 Step 7 - Redis value prepared:', {
        key: `payment:${paystackReference}`,
        data: JSON.parse(redisValue)
      });

      await redisClient.set(`payment:${paystackReference}`, redisValue);
      
      console.log('🔍 Step 8 - Redis storage complete');
      console.log('🔍 ========== END PURCHASE DEBUG ==========\n');
      
      logger.info(`✅ Payment initialized for event ${eventId} by user ${userId}, ref: ${paystackReference}`);
      logger.info(`💰 Amount: ₦${nairaTotal} (${totalAmountInKobo} kobo) for ${quantity} ticket(s)`);
      
      return {
        paymentUrl: paymentData.authorization_url,
        reference: paystackReference,
        amount: totalAmountInKobo,
      };
    } catch (error: any) {
      console.error('❌ ERROR in purchaseTicket:', error);
      logger.error(`❌ Ticket purchase error: ${error.message}`);
      throw error;
    }
  }

  async verifyPayment(reference: string): Promise<{ 
    success: boolean; 
    ticket?: ITicket; 
    message: string;
  }> {
    try {
      console.log(`\n🔍 ========== VERIFY PAYMENT DEBUG ==========`);
      console.log('Step V1 - Started for reference:', reference);

      const paymentIntent = await redisClient.get(`payment:${reference}`);
      
      if (!paymentIntent) {
        console.error('🔍 Step V2 - No payment intent found in Redis');
        return {
          success: false,
          message: 'Payment session expired or not found. Please try purchasing again.',
        };
      }

      const paymentIntentData = JSON.parse(paymentIntent);
      console.log('🔍 Step V2 - Payment intent data:', paymentIntentData);

      const paymentData = await paystackService.verifyTransaction(reference);
      console.log('🔍 Step V3 - Paystack verification response:', {
        status: paymentData.status,
        amount: paymentData.amount,
        amountInNaira: paymentData.amount / 100,
        reference: paymentData.reference
      });
      
      // 🔥 FIX: Use type assertion for gateway_response
      if (paymentData.status !== 'success') {
        const gatewayResponse = (paymentData as any).gateway_response;
        throw new Error(`Payment verification failed: ${gatewayResponse || 'Unknown error'}`);
      }

      const ticketNumber = qrCodeService.generateTicketNumber();
      
      const pricePerTicket = Math.round((paymentIntentData.totalAmount / paymentIntentData.quantity) * 100);
      
      console.log('🔍 Step V4 - Creating ticket with:', {
        eventId: paymentIntentData.eventId,
        userId: paymentIntentData.userId,
        ticketNumber,
        pricePerTicketInKobo: pricePerTicket,
        priceInNaira: pricePerTicket / 100,
        quantity: paymentIntentData.quantity,
        totalNaira: paymentIntentData.totalAmount
      });

      const ticket = await this.createTicket({
        eventId: paymentIntentData.eventId,
        userId: paymentIntentData.userId,
        ticketNumber,
        price: pricePerTicket,
        paymentReference: reference,
      });

      await redisClient.del(`payment:${reference}`);
      console.log('🔍 Step V5 - Ticket created successfully:', ticket._id);
      console.log('🔍 ========== END VERIFY DEBUG ==========\n');

      return {
        success: true,
        ticket,
        message: 'Payment successful and ticket created',
      };
    } catch (error: any) {
      console.error('🔍 VERIFY - Error:', error);
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