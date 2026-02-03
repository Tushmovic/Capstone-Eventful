export const constants = {
  ROLES: {
    CREATOR: 'creator',
    EVENTEE: 'eventee',
    ADMIN: 'admin',
  },
  TICKET_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    USED: 'used',
    CANCELLED: 'cancelled',
  },
  PAYMENT_STATUS: {
    PENDING: 'pending',
    SUCCESSFUL: 'successful',
    FAILED: 'failed',
  },
  NOTIFICATION_TYPES: {
    EVENT_REMINDER: 'event_reminder',
    TICKET_PURCHASED: 'ticket_purchased',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    EVENT_CREATED: 'event_created',
  },
  REMINDER_TIMES: {
    ONE_HOUR: '1h',
    ONE_DAY: '1d',
    ONE_WEEK: '1w',
    CUSTOM: 'custom',
  },
  CACHE_TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
  },
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  PAGINATION: {
    DEFAULT_LIMIT: 10,
    DEFAULT_PAGE: 1,
    MAX_LIMIT: 100,
  },
};