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
      console.log('\n🔍 ========== PAYSTACK SERVICE DEBUG ==========');
      console.log('🔍 PStep 1 - initializeTransaction received:', {
        email,
        amountInKobo: amount,
        expectedNaira: amount / 100,
        expectedDisplay: `₦${(amount / 100).toLocaleString()}`,
        hasMetadata: !!metadata,
        hasReference: !!reference
      });

      // 🔥 CRITICAL FIX: Paystack is multiplying by 100, so we need to send in Naira!
      const amountInNaira = amount / 100;
      
      console.log('🔍 PStep 1b - After dividing by 100:', {
        amountInNaira,
        willBeMultipliedByPaystack: amountInNaira * 100,
        finalAmount: amountInNaira * 100
      });

      const payload: any = {
        email,
        amount: amountInNaira, // Send in Naira, not kobo!
        metadata,
      };

      if (reference) {
        payload.reference = reference;
      }

      console.log('🔍 PStep 2 - Payload being sent to Paystack API:', {
        email: payload.email,
        amount: payload.amount,
        amountInKobo: payload.amount * 100,
        hasReference: !!payload.reference,
        metadataKeys: payload.metadata ? Object.keys(payload.metadata) : []
      });

      const response = await axios.post<IPaystackInitializeResponse>(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        payload,
        { headers: this.headers }
      );

      console.log('🔍 PStep 3 - Raw Paystack response status:', response.data.status);
      
      if (response.data.status) {
        console.log('🔍 PStep 4 - Paystack response data:', {
          authorization_url: response.data.data.authorization_url,
          reference: response.data.data.reference,
          access_code_provided: !!response.data.data.access_code
        });
      }

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to initialize payment');
      }

      console.log('🔍 ========== END PAYSTACK DEBUG ==========\n');

      return {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error: any) {
      console.error('❌ Paystack service error:', error.message);
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
          amount: amount * 100, // Amount should be in kobo for transfers
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