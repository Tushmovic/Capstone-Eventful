import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Eventful API Documentation',
      version: '1.0.0',
      description: 'Event ticketing platform API documentation',
      contact: {
        name: 'Eventful Team',
        email: 'support@eventful.com',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:5000/api/v1',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Events',
        description: 'Event management operations',
      },
      {
        name: 'Tickets',
        description: 'Ticket booking and management',
      },
      {
        name: 'Payments',
        description: 'Payment processing',
      },
      {
        name: 'Analytics',
        description: 'Event analytics and insights',
      },
      {
        name: 'Notifications',
        description: 'Notification management',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;