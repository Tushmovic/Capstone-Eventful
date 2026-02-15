import axios from 'axios';
import { logger } from '../utils/logger';
import { IPaystackInitializeResponse, IPaystackVerifyResponse } from '../interfaces/payment.interface';

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
    metadata?: Record<string, any>,
    reference?: string
  ): Promise<{ 
    authorization_url: string; 
    access_code: string; 
    reference: string;
  }> {
    try {
      // 🔥 FOOLPROOF FIX: Paystack test environment multiplies by 100
      // Let's send the amount in Naira directly
      const amountInNaira = Math.round(amount / 100);
      
      console.log('🔍 Paystack Debug - Payment Init:', {
        receivedFromTicketService: amount,
        inNaira: amountInNaira,
        willBeMultipliedByPaystack: amountInNaira * 100,
        finalDisplay: `₦${amountInNaira}`
      });

      const payload: any = {
        email,
        amount: amountInNaira, // Send in Naira
        metadata,
      };

      if (reference) {
        payload.reference = reference;
      }

      console.log('🔍 Payload being sent:', payload);

      const response = await axios.post<IPaystackInitializeResponse>(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        payload,
        { headers: this.headers }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to initialize payment');
      }

      return {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error: any) {
      logger.error(`Paystack initialize transaction error: ${error.message}`);
      throw new Error('Failed to initialize payment');
    }
  }

  async verifyTransaction(reference: string): Promise<any> {
    try {
      const response = await axios.get<IPaystackVerifyResponse>(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        { headers: this.headers }
      );

      return response.data.data;
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
          amount: amount / 100,
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