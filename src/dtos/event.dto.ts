import Joi from 'joi';
import { constants } from '../config/constants';

export const createEventSchema = Joi.object({
  title: Joi.string().min(5).max(200).required().messages({
    'string.base': 'Title must be a string',
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 5 characters',
    'string.max': 'Title cannot exceed 200 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().min(20).max(5000).required().messages({
    'string.base': 'Description must be a string',
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 20 characters',
    'string.max': 'Description cannot exceed 5000 characters',
    'any.required': 'Description is required',
  }),
  category: Joi.string().required().messages({
    'string.base': 'Category must be a string',
    'string.empty': 'Category is required',
    'any.required': 'Category is required',
  }),
  tags: Joi.array().items(Joi.string()).max(10).optional().messages({
    'array.max': 'Cannot have more than 10 tags',
  }),
  date: Joi.date().iso().greater('now').required().messages({
    'date.base': 'Date must be a valid date',
    'date.format': 'Date must be in ISO format',
    'date.greater': 'Event date must be in the future',
    'any.required': 'Date is required',
  }),
  startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'Start time must be in HH:MM format',
    'any.required': 'Start time is required',
  }),
  endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'End time must be in HH:MM format',
    'any.required': 'End time is required',
  }),
  location: Joi.object({
    venue: Joi.string().required().messages({
      'string.empty': 'Venue is required',
      'any.required': 'Venue is required',
    }),
    address: Joi.string().required().messages({
      'string.empty': 'Address is required',
      'any.required': 'Address is required',
    }),
    city: Joi.string().required().messages({
      'string.empty': 'City is required',
      'any.required': 'City is required',
    }),
    state: Joi.string().required().messages({
      'string.empty': 'State is required',
      'any.required': 'State is required',
    }),
    country: Joi.string().required().messages({
      'string.empty': 'Country is required',
      'any.required': 'Country is required',
    }),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90).optional(),
      lng: Joi.number().min(-180).max(180).optional(),
    }).optional(),
  }).required(),
  organizer: Joi.object({
    name: Joi.string().required().messages({
      'string.empty': 'Organizer name is required',
      'any.required': 'Organizer name is required',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Organizer email must be valid',
      'any.required': 'Organizer email is required',
    }),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required().messages({
      'string.pattern.base': 'Organizer phone must be 10-15 digits',
      'any.required': 'Organizer phone is required',
    }),
    website: Joi.string().uri().optional().messages({
      'string.uri': 'Organizer website must be a valid URL',
    }),
  }).required(),
  ticketPrice: Joi.number().min(0).required().messages({
    'number.base': 'Ticket price must be a number',
    'number.min': 'Ticket price cannot be negative',
    'any.required': 'Ticket price is required',
  }),
  totalTickets: Joi.number().integer().min(1).required().messages({
    'number.base': 'Total tickets must be a number',
    'number.integer': 'Total tickets must be an integer',
    'number.min': 'Total tickets must be at least 1',
    'any.required': 'Total tickets is required',
  }),
  status: Joi.string().valid('draft', 'published').default('draft').messages({
    'any.only': 'Status must be either draft or published',
  }),
  visibility: Joi.string().valid('public', 'private').default('public').messages({
    'any.only': 'Visibility must be either public or private',
  }),
  reminders: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('1h', '1d', '1w', 'custom').required(),
      customTime: Joi.date().iso().when('type', {
        is: 'custom',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
    })
  ).max(5).optional().messages({
    'array.max': 'Cannot have more than 5 reminders',
  }),
});

export const updateEventSchema = Joi.object({
  title: Joi.string().min(5).max(200).optional(),
  description: Joi.string().min(20).max(5000).optional(),
  category: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).max(10).optional(),
  date: Joi.date().iso().greater('now').optional(),
  startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  location: Joi.object({
    venue: Joi.string().optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    country: Joi.string().optional(),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90).optional(),
      lng: Joi.number().min(-180).max(180).optional(),
    }).optional(),
  }).optional(),
  organizer: Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
    website: Joi.string().uri().optional(),
  }).optional(),
  ticketPrice: Joi.number().min(0).optional(),
  totalTickets: Joi.number().integer().min(1).optional(),
  status: Joi.string().valid('draft', 'published', 'cancelled').optional(),
  visibility: Joi.string().valid('public', 'private').optional(),
  reminders: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('1h', '1d', '1w', 'custom').required(),
      customTime: Joi.date().iso().when('type', {
        is: 'custom',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
    })
  ).max(5).optional(),
});

export const eventFilterSchema = Joi.object({
  category: Joi.string().optional(),
  tags: Joi.string().optional(), // Comma-separated tags
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  location: Joi.string().optional(),
  priceMin: Joi.number().min(0).optional(),
  priceMax: Joi.number().min(0).optional(),
  status: Joi.string().valid('published', 'draft', 'cancelled', 'completed').optional(),
  visibility: Joi.string().valid('public', 'private').optional(),
  search: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('date', 'price', 'createdAt', 'views').default('date'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});