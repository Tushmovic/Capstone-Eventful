import { IsString, IsNumber, IsOptional, IsEnum, IsMongoId, Min } from 'class-validator';

export class InitializePaymentDto {
  @IsString()
  email: string;

  @IsNumber()
  @Min(100) // Minimum 1 Naira (100 kobo)
  amount: number;

  @IsOptional()
  metadata?: any;
}

export class VerifyPaymentDto {
  @IsString()
  reference: string;
}

export class PaymentWebhookDto {
  @IsString()
  event: string;

  data: {
    reference: string;
    status: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    currency: string;
    channel: string;
    metadata: any;
    customer: {
      email: string;
    };
  };
}

export class PaymentResponseDto {
  _id: string;
  reference: string;
  userId: any;
  eventId: any;
  ticketId: any;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(payment: any) {
    this._id = payment._id;
    this.reference = payment.reference;
    this.userId = payment.userId;
    this.eventId = payment.eventId;
    this.ticketId = payment.ticketId;
    this.amount = payment.amount;
    this.currency = payment.currency;
    this.status = payment.status;
    this.paymentMethod = payment.paymentMethod;
    this.createdAt = payment.createdAt;
    this.updatedAt = payment.updatedAt;
  }
}