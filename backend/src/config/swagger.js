import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SereneAI API Documentation',
      version: '1.0.0',
      description: `
# SereneAI - Dental Clinic Management Platform API

## 📱 For Mobile Developers

This is the comprehensive API documentation for SereneAI, a dental clinic management platform.

### Base URL
- **Development:** \`http://localhost:4000/v1\`
- **Staging:** \`TBD\`
- **Production:** \`TBD\`

### Authentication

Most endpoints require JWT Bearer token authentication:

\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

Get token from \`POST /auth/login\` or \`POST /auth/patient/register\`

### Rate Limiting

- **Auth endpoints:** 5 requests / 15 minutes
- **OTP endpoints:** 3 requests / 5 minutes
- **General endpoints:** 100 requests / minute

### Error Handling

All errors follow this format:

\`\`\`json
{
  "code": 1004,
  "errorCode": "AUTH_OTP_INVALID",
  "message": "Kode OTP tidak valid",
  "solution": "Periksa kembali kode yang Anda masukkan",
  "details": null
}
\`\`\`

See full error code reference: [Error Codes](/docs/ERROR_CODE_REFERENCE.md)

### Localization

Set \`Accept-Language\` header for localized responses:
- \`id\` - Indonesian (default)
- \`en\` - English
      `,
      contact: {
        name: 'SereneAI Development Team',
        email: 'dev@sereneai.com'
      },
      license: {
        name: 'Proprietary',
      }
    },
    servers: [
      {
        url: 'http://localhost:4000/v1',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.sereneai.com/v1',
        description: 'Staging server',
      },
      {
        url: 'https://api.sereneai.com/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login/register endpoints',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              description: 'Numeric error code (1000-9999)',
              example: 1004,
            },
            errorCode: {
              type: 'string',
              description: 'Machine-readable error identifier',
              example: 'AUTH_OTP_INVALID',
            },
            message: {
              type: 'string',
              description: 'Human-readable error message (localized)',
              example: 'Kode OTP tidak valid',
            },
            solution: {
              type: 'string',
              description: 'Suggested action for user',
              example: 'Periksa kembali kode yang Anda masukkan',
            },
            details: {
              description: 'Additional error context (optional)',
              oneOf: [
                { type: 'null' },
                { type: 'object' },
                { type: 'array' },
              ],
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 123,
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'patient@example.com',
            },
            role: {
              type: 'string',
              enum: ['patient', 'dentist', 'admin', 'super_admin'],
              example: 'patient',
            },
            phoneNumber: {
              type: 'string',
              example: '+628123456789',
            },
            isPhoneVerified: {
              type: 'boolean',
              example: true,
            },
            isEmailVerified: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Patient: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 456,
            },
            userId: {
              type: 'integer',
              example: 123,
            },
            fullName: {
              type: 'string',
              example: 'John Doe',
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              example: '1990-01-15',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'male',
            },
            emergencyContact: {
              type: 'string',
              example: '+628987654321',
            },
            medicalHistory: {
              type: 'object',
              example: { allergies: ['penicillin'], conditions: [] },
            },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 789,
            },
            patientId: {
              type: 'integer',
              example: 456,
            },
            dentistId: {
              type: 'integer',
              example: 12,
            },
            clinicId: {
              type: 'integer',
              example: 1,
            },
            appointmentDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-11-15T10:00:00Z',
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
              example: 'confirmed',
            },
            serviceType: {
              type: 'string',
              example: 'Dental Cleaning',
            },
            notes: {
              type: 'string',
              example: 'Patient has sensitive teeth',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 1007,
                errorCode: 'AUTH_UNAUTHORIZED',
                message: 'Anda tidak memiliki akses',
                solution: 'Silakan login terlebih dahulu',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Access forbidden',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 1008,
                errorCode: 'AUTH_FORBIDDEN',
                message: 'Akses ditolak',
                solution: 'Anda tidak memiliki izin untuk mengakses resource ini',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Error' },
                  {
                    type: 'object',
                    properties: {
                      details: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: {
                              type: 'string',
                              example: 'email',
                            },
                            message: {
                              type: 'string',
                              example: 'Format email tidak valid',
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
              example: {
                code: 9001,
                errorCode: 'VALIDATION_ERROR',
                message: 'Data tidak valid',
                solution: 'Periksa kembali data yang Anda masukkan',
                details: [
                  {
                    field: 'email',
                    message: 'Format email tidak valid',
                  },
                  {
                    field: 'password',
                    message: 'Password minimal 8 karakter',
                  },
                ],
              },
            },
          },
        },
        RateLimitError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 9004,
                errorCode: 'RATE_LIMIT_EXCEEDED',
                message: 'Terlalu banyak request',
                solution: 'Silakan tunggu beberapa saat',
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 9002,
                errorCode: 'SERVER_ERROR',
                message: 'Terjadi kesalahan server',
                solution: 'Coba lagi atau hubungi support',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and registration endpoints',
      },
      {
        name: 'OTP Verification',
        description: 'Phone and email OTP verification',
      },
      {
        name: 'Appointments',
        description: 'Appointment booking and management',
      },
      {
        name: 'Payments',
        description: 'Payment processing and management',
      },
      {
        name: 'Communications',
        description: 'Chat and video call endpoints',
      },
      {
        name: 'Notifications',
        description: 'Push notifications and device management',
      },
      {
        name: 'Profile',
        description: 'User profile management',
      },
      {
        name: 'Clinics',
        description: 'Clinic information, services, and dentist listings',
      },
      {
        name: 'Dentists',
        description: 'Dentist profiles, schedules, and appointment slots',
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/docs/*.swagger.js'
  ], // Path to the API routes and swagger docs
};

export const swaggerSpec = swaggerJsdoc(options);
