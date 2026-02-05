// src/dtos/payment.dto.ts
import Joi from 'joi';

export const initializePaymentSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Valid email is required',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
  amount: Joi.number().min(100).required().messages({
    'number.base': 'Amount must be a number',
    'number.min': 'Amount must be at least ₦1 (100 kobo)',
    'any.required': 'Amount is required',
  }),
  metadata: Joi.object().optional(),
});

export const verifyPaymentSchema = Joi.object({
  reference: Joi.string().required().messages({
    'string.base': 'Reference must be a string',
    'string.empty': 'Reference is required',
    'any.required': 'Reference is required',
  }),
});

export const paymentWebhookSchema = Joi.object({
  event: Joi.string().required().messages({
    'string.base': 'Event type must be a string',
    'string.empty': 'Event type is required',
    'any.required': 'Event type is required',
  }),
  data: Joi.object({
    reference: Joi.string().required(),
    status: Joi.string().required(),
    amount: Joi.number().required(),
    metadata: Joi.object().optional(),
  }).required(),
});

export const paymentFilterSchema = Joi.object({
  status: Joi.string().valid('pending', 'successful', 'failed').optional(),
  eventId: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});