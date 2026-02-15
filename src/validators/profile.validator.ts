import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.base': 'Name must be a string',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 100 characters',
  }),
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).optional().allow('').messages({
    'string.pattern.base': 'Phone number must be 10-15 digits',
  }),
  bio: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Bio cannot exceed 500 characters',
  }),
  website: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Website must be a valid URL',
  }),
  profileImage: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Profile image must be a valid URL',
  }),
  socialMedia: Joi.object({
    twitter: Joi.string().uri().optional().allow(''),
    facebook: Joi.string().uri().optional().allow(''),
    instagram: Joi.string().uri().optional().allow(''),
    linkedin: Joi.string().uri().optional().allow(''),
  }).optional(),
  notificationPreferences: Joi.object({
    email: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
    push: Joi.boolean().optional(),
  }).optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});