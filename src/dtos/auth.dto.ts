import Joi from 'joi';
import { constants } from '../config/constants';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.base': 'Name must be a string',
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.base': 'Email must be a string',
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).max(100).required().messages({
    'string.base': 'Password must be a string',
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password cannot exceed 100 characters',
    'any.required': 'Password is required',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Please confirm your password',
  }),
  role: Joi.string().valid(constants.ROLES.CREATOR, constants.ROLES.EVENTEE).required().messages({
    'string.base': 'Role must be a string',
    'any.only': 'Role must be either creator or eventee',
    'any.required': 'Role is required',
  }),
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).optional().messages({
    'string.pattern.base': 'Phone number must be 10-15 digits',
  }),
  profileImage: Joi.string().uri().optional().messages({
    'string.uri': 'Profile image must be a valid URL',
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.base': 'Email must be a string',
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'string.base': 'Password must be a string',
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'string.base': 'Refresh token must be a string',
    'string.empty': 'Refresh token is required',
    'any.required': 'Refresh token is required',
  }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.base': 'Current password must be a string',
    'string.empty': 'Current password is required',
    'any.required': 'Current password is required',
  }),
  newPassword: Joi.string().min(8).max(100).required().messages({
    'string.base': 'New password must be a string',
    'string.empty': 'New password is required',
    'string.min': 'New password must be at least 8 characters',
    'string.max': 'New password cannot exceed 100 characters',
    'any.required': 'New password is required',
  }),
  confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'New passwords do not match',
    'any.required': 'Please confirm your new password',
  }),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.base': 'Name must be a string',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 100 characters',
  }),
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).optional().messages({
    'string.pattern.base': 'Phone number must be 10-15 digits',
  }),
  bio: Joi.string().max(500).optional().messages({
    'string.max': 'Bio cannot exceed 500 characters',
  }),
  website: Joi.string().uri().optional().messages({
    'string.uri': 'Website must be a valid URL',
  }),
  socialMedia: Joi.object({
    twitter: Joi.string().uri().optional(),
    facebook: Joi.string().uri().optional(),
    instagram: Joi.string().uri().optional(),
    linkedin: Joi.string().uri().optional(),
  }).optional(),
  notificationPreferences: Joi.object({
    email: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
    push: Joi.boolean().optional(),
  }).optional(),
});

// Export all schemas
export default {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
};