import axios from 'axios';
import { logger } from '../../utils/logger';
import { IPaystackInitializeResponse, IPaystackVerifyResponse, IPaymentWebhookData } from '../../interfaces/payment.interface';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export class PaystackService {
  private readonly headers = {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };

  async initializeTransaction(
    email: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<{ reference: string; authorization_url: string; access_code: string }> {
    try {
      const reference = `EVT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await axios.post<IPaystackInitializeResponse>(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email,
          amount: amount * 100, // Convert to kobo
          reference,
          metadata,
          // 🔥 FIX: Remove hardcoded backend URL - let Paystack use dashboard setting
          // callback_url: `${process.env.API_BASE_URL}/api/v1/payments/verify`,
        },
        { headers: this.headers }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to initialize payment');
      }

      return {
        reference,
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
      };
    } catch (error: any) {
      logger.error(`Paystack initialize transaction error: ${error.message}`);
      throw new Error('Failed to initialize payment');
    }
  }

  async verifyTransaction(reference: string): Promise<IPaystackVerifyResponse['data']> {
    try {
      const response = await axios.get<IPaystackVerifyResponse>(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        { headers: this.headers }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to verify payment');
      }

      return response.data.data;
    } catch (error: any) {
      logger.error(`Paystack verify transaction error: ${error.message}`);
      throw new Error('Failed to verify payment');
    }
  }

  async handleWebhook(eventData: IPaymentWebhookData): Promise<{ success: boolean; data: any }> {
    try {
      const { event, data } = eventData;
      
      switch (event) {
        case 'charge.success':
          logger.info(`Payment successful for reference: ${data.reference}`);
          return {
            success: true,
            data: {
              reference: data.reference,
              status: 'successful',
              amount: data.amount / 100, // Convert from kobo
              paidAt: data.paid_at,
              metadata: data.metadata,
            },
          };
          
        case 'charge.failed':
          logger.warn(`Payment failed for reference: ${data.reference}`);
          return {
            success: false,
            data: {
              reference: data.reference,
              status: 'failed',
              message: data.message,
              gatewayResponse: data.gateway_response,
            },
          };
          
        default:
          logger.info(`Unhandled webhook event: ${event}`);
          return {
            success: false,
            data: { event, message: 'Unhandled event type' },
          };
      }
    } catch (error: any) {
      logger.error(`Paystack webhook handling error: ${error.message}`);
      throw error;
    }
  }

  async verifyWebhookSignature(payload: any, signature: string): Promise<boolean> {
    try {
      // Paystack sends webhook signature in x-paystack-signature header
      // For now, we'll trust the webhook (in production, implement HMAC verification)
      logger.info(`Webhook signature verification skipped for development`);
      return true;
    } catch (error: any) {
      logger.error(`Webhook signature verification error: ${error.message}`);
      return false;
    }
  }

  getPublicKey(): string {
    return PAYSTACK_PUBLIC_KEY;
  }

  async getBanks(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank`,
        { headers: this.headers, params: { country: 'nigeria' } }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to fetch banks');
      }

      return response.data.data;
    } catch (error: any) {
      logger.error(`Paystack get banks error: ${error.message}`);
      throw new Error('Failed to fetch banks');
    }
  }
}

export const paystackService = new PaystackService();