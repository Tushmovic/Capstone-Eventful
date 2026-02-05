import { body, param, query } from 'express-validator';

export const purchaseTicketSchema = [
  body('eventId')
    .notEmpty()
    .withMessage('Event ID is required')
    .isMongoId()
    .withMessage('Invalid Event ID format'),
  
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
];

export const verifyTicketSchema = [
  param('ticketCode')
    .notEmpty()
    .withMessage('Ticket code is required')
    .isString()
    .withMessage('Ticket code must be a string'),
];

export const cancelTicketSchema = [
  param('ticketId')
    .notEmpty()
    .withMessage('Ticket ID is required')
    .isMongoId()
    .withMessage('Invalid Ticket ID format'),
];