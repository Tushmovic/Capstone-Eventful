export interface IPaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface IPaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    paid_at: string;
    created_at: string;
    currency: string;
    channel: string;
    metadata: any;
    customer: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      phone: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
  };
}

export interface IPaymentInput {
  eventId: string;
  userId: string;
  quantity: number;
  email: string;
  amount: number;
  metadata?: any;
}

export interface IPaymentWebhookData {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    customer: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      phone: string;
    };
  };
}