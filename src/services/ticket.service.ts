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

      // 🔥 DEBUG - Check what's in the database
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

      // Calculate amounts
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

      // Generate a truly unique reference
      const uniqueReference = `EVT_${Date.now()}_${userId.substring(0,5)}_${Math.random().toString(36).substring(2, 8)}`;

      console.log('🔍 Step 4 - Generated reference:', uniqueReference);

      // 🔥 DEBUG - What's being sent to Paystack
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

      // Store in Redis
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
      
      if (paymentData.status !== 'success') {
        throw new Error(`Payment verification failed: ${paymentData.gateway_response || 'Unknown error'}`);
      }

      const ticketNumber = qrCodeService.generateTicketNumber();
      
      // Calculate price per ticket in kobo from naira total
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

  // ... rest of your methods remain exactly the same (createTicket, verifyTicket, etc.)
}

export const ticketService = new TicketService();