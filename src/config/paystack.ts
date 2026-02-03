import axios from 'axios';
import { logger } from '../utils/logger';

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
    reference: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email,
          amount: amount * 100, // Convert to kobo
          reference,
          metadata,
          callback_url: `${process.env.API_BASE_URL}/api/v1/payments/verify`,
        },
        { headers: this.headers }
      );

      return response.data;
    } catch (error: any) {
      logger.error(`Paystack initialize transaction error: ${error.message}`);
      throw new Error('Failed to initialize payment');
    }
  }

  async verifyTransaction(reference: string): Promise<any> {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        { headers: this.headers }
      );

      return response.data;
    } catch (error: any) {
      logger.error(`Paystack verify transaction error: ${error.message}`);
      throw new Error('Failed to verify payment');
    }
  }

  async createTransferRecipient(
    name: string,
    accountNumber: string,
    bankCode: string,
    type: string = 'nuban'
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transferrecipient`,
        {
          type,
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        },
        { headers: this.headers }
      );

      return response.data;
    } catch (error: any) {
      logger.error(`Paystack create recipient error: ${error.message}`);
      throw new Error('Failed to create transfer recipient');
    }
  }

  async initiateTransfer(
    recipientCode: string,
    amount: number,
    reason: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transfer`,
        {
          source: 'balance',
          amount: amount * 100,
          recipient: recipientCode,
          reason,
        },
        { headers: this.headers }
      );

      return response.data;
    } catch (error: any) {
      logger.error(`Paystack initiate transfer error: ${error.message}`);
      throw new Error('Failed to initiate transfer');
    }
  }
}

export const paystackService = new PaystackService();