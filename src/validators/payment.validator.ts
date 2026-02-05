import { body, param, query } from 'express-validator';

export const initializePaymentSchema = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 100 }) // Minimum 1 Naira (100 kobo)
    .withMessage('Amount must be at least 1 Naira (100 kobo)'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];

export const verifyPaymentSchema = [
  param('reference')
    .notEmpty()
    .withMessage('Payment reference is required')
    .isString()
    .withMessage('Payment reference must be a string'),
];