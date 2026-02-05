import Joi from 'joi';
import { constants } from '../config/constants';

export const purchaseTicketSchema = Joi.object({
  eventId: Joi.string().required().messages({
    'string.base': 'Event ID must be a string',
    'string.empty': 'Event ID is required',
    'any.required': 'Event ID is required',
  }),
  quantity: Joi.number().integer().min(1).max(10).required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.min': 'Quantity must be at least 1',
    'number.max': 'Cannot purchase more than 10 tickets at once',
    'any.required': 'Quantity is required',
  }),
});

export const verifyTicketSchema = Joi.object({
  ticketCode: Joi.string().required().messages({
    'string.base': 'Ticket code must be a string',
    'string.empty': 'Ticket code is required',
    'any.required': 'Ticket code is required',
  }),
});

export const cancelTicketSchema = Joi.object({
  ticketId: Joi.string().required().messages({
    'string.base': 'Ticket ID must be a string',
    'string.empty': 'Ticket ID is required',
    'any.required': 'Ticket ID is required',
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

export const ticketFilterSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'used', 'cancelled', 'expired').optional(),
  eventId: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});