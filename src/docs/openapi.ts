import { z } from 'zod';
import { registerSchema } from '../modules/auth/auth.schemas.js';

const registerJsonSchema = z.toJSONSchema(registerSchema, {
  io: 'input',
  unrepresentable: 'any',
});

export const openApiDocument = {
  openapi: '3.1.0',

  info: {
    title: 'Kitab API',
    version: '0.2.0',
    description: 'API REST del organizador académico Kitab.',
  },

  servers: [
    {
      url: '/',
      description: 'Servidor desde el que se sirve la documentación.',
    },
  ],

  tags: [
    {
      name: 'Auth',
      description: 'Registro, autenticación y gestión de sesiones.',
    },
  ],

  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        operationId: 'registerUser',
        summary: 'Registrar un usuario',
        description: [
          'Crea una nueva cuenta de usuario.',
          'El nombre, apellido y correo se recortan; el correo se guarda en minúsculas.',
          'La contraseña debe tener al menos 6 caracteres y no puede contener solo espacios.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),

        parameters: [
          {
            name: 'Origin',
            in: 'header',
            required: true,
            description: 'Origen incluido en `ALLOWED_ORIGINS`. El navegador lo administra automáticamente.',
            schema: {
              type: 'string',
              format: 'uri',
            },
            example: 'http://localhost:5173',
          },
        ],

        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: registerJsonSchema,
              examples: {
                validRegistration: {
                  summary: 'Registro válido',
                  value: {
                    firstName: 'Alfonso',
                    lastName: 'Conejo',
                    email: 'alfonso@example.com',
                    password: 'secure-password',
                  },
                },
              },
            },
          },
        },

        responses: {
          '201': {
            description: 'Usuario registrado correctamente.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterSuccess' },
                examples: {
                  registered: {
                    value: {
                      success: true,
                      message: 'Usuario creado correctamente',
                      user: {
                        id: 7,
                        firstName: 'Alfonso',
                        lastName: 'Conejo',
                        email: 'alfonso@example.com',
                        fullName: 'Alfonso Conejo',
                        createdAt: '2026-01-01T00:00:00.000Z',
                        updatedAt: null,
                      },
                    },
                  },
                },
              },
            },
          },

          '400': {
            description: 'Datos de registro inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El correo electrónico es inválido.',
                },
              },
            },
          },

          '403': {
            description: 'El encabezado Origin falta o no está permitido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CsrfError' },
                example: {
                  code: 'INVALID_ORIGIN',
                  message: 'Origen no permitido',
                },
              },
            },
          },

          '409': {
            description: 'Ya existe una cuenta con ese correo electrónico.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El usuario ya existe',
                },
              },
            },
          },

          '500': {
            description: 'Error interno del servidor o configuración CSRF ausente.',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/ApiError' },
                    { $ref: '#/components/schemas/CsrfConfigurationError' },
                  ],
                },
                examples: {
                  internalError: {
                    value: {
                      success: false,
                      message: 'Error interno del servidor',
                    },
                  },
                  csrfNotConfigured: {
                    value: {
                      code: 'CSRF_ORIGIN_NOT_CONFIGURED',
                      message: 'Error interno del servidor',
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

  components: {
    schemas: {
      User: {
        type: 'object',
        required: [
          'id',
          'firstName',
          'lastName',
          'email',
          'fullName',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'integer', example: 7 },
          firstName: { type: 'string', example: 'Alfonso' },
          lastName: { type: 'string', example: 'Conejo' },
          email: { type: 'string', example: 'alfonso@example.com' },
          fullName: { type: 'string', example: 'Alfonso Conejo' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: {
            anyOf: [
              { type: 'string', format: 'date-time' },
              { type: 'null' },
            ],
          },
        },
      },
      RegisterSuccess: {
        type: 'object',
        required: ['success', 'message', 'user'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', example: 'Usuario creado correctamente' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      ApiError: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', const: false },
          message: { type: 'string' },
        },
      },
      CsrfError: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', const: 'INVALID_ORIGIN' },
          message: { type: 'string', const: 'Origen no permitido' },
        },
      },
      CsrfConfigurationError: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', const: 'CSRF_ORIGIN_NOT_CONFIGURED' },
          message: { type: 'string', const: 'Error interno del servidor' },
        },
      },
    },
  },
};
