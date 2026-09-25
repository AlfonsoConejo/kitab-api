import { z } from 'zod';
import { loginSchema, registerSchema } from '../modules/auth/auth.schemas.js';
import { periodSchema } from '../modules/periods/periods.schemas.js';
import {
  createClassesSchema,
  createSubjectSchema,
  updateSubjectSchema,
} from '../modules/subjects/subjects.schemas.js';

const registerJsonSchema = z.toJSONSchema(registerSchema, {
  io: 'input',
  unrepresentable: 'any',
});

const loginJsonSchema = z.toJSONSchema(loginSchema, {
  io: 'input',
  unrepresentable: 'any',
});

const periodJsonSchema = z.toJSONSchema(periodSchema, {
  io: 'input',
  unrepresentable: 'any',
});

const createSubjectJsonSchema = z.toJSONSchema(createSubjectSchema, {
  io: 'input',
  unrepresentable: 'any',
});

const updateSubjectJsonSchema = z.toJSONSchema(updateSubjectSchema, {
  io: 'input',
  unrepresentable: 'any',
});

const createClassesJsonSchema = z.toJSONSchema(createClassesSchema, {
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
    {
      name: 'Periods',
      description: 'Gestión de períodos académicos del usuario autenticado.',
    },
    {
      name: 'Subjects',
      description: 'Gestión de materias y sus clases dentro de períodos académicos.',
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
          { $ref: '#/components/parameters/AllowedOrigin' },
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
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        operationId: 'loginUser',
        summary: 'Iniciar sesión',
        description: [
          'Valida las credenciales y crea una sesión nueva.',
          'El correo se recorta y se convierte a minúsculas.',
          'La respuesta establece las cookies HTTP-only `accessToken` y `refreshToken`.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),

        parameters: [
          { $ref: '#/components/parameters/AllowedOrigin' },
        ],

        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: loginJsonSchema,
              examples: {
                validCredentials: {
                  summary: 'Credenciales válidas',
                  value: {
                    email: 'alfonso@example.com',
                    password: 'secure-password',
                  },
                },
              },
            },
          },
        },

        responses: {
          '200': {
            description: 'Sesión iniciada correctamente.',
            headers: {
              'Set-Cookie': {
                description: [
                  'Se envía una vez para `accessToken` (15 minutos) y otra para `refreshToken` (7 días).',
                  'Ambas cookies son `HttpOnly`, usan `SameSite=Lax` y son `Secure` en producción.',
                ].join(' '),
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginSuccess' },
                example: {
                  success: true,
                  message: 'Login exitoso',
                  data: {
                    user: {
                      id: 7,
                      firstName: 'Alfonso',
                      lastName: 'Conejo',
                      email: 'alfonso@example.com',
                      fullName: 'Alfonso Conejo',
                      createdAt: '2026-01-01T00:00:00.000Z',
                      updatedAt: null,
                    },
                    session: { id: 19 },
                  },
                },
              },
            },
          },

          '400': {
            description: 'Credenciales incompletas.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Todos los campos son obligatorios',
                },
              },
            },
          },

          '401': {
            description: 'Correo o contraseña incorrectos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Usuario o contraseña incorrectos',
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
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        operationId: 'getCurrentUser',
        summary: 'Obtener el usuario autenticado',
        description: 'Devuelve el perfil del usuario asociado a la cookie HTTP-only `accessToken`.',
        security: [
          { cookieAuth: [] },
        ],

        responses: {
          '200': {
            description: 'Perfil del usuario autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CurrentUserSuccess' },
                example: {
                  success: true,
                  data: {
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

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
                },
              },
            },
          },

          '404': {
            description: 'El usuario asociado a la sesión ya no existe.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Usuario no encontrado',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
                },
              },
            },
          },

          '500': {
            description: 'Error interno del servidor al obtener el usuario.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Error interno del servidor',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        operationId: 'refreshUserSession',
        summary: 'Renovar la sesión',
        description: [
          'Consume el `refreshToken` actual y emite un nuevo access token y refresh token.',
          'El refresh token es de un solo uso; si se reutiliza, la sesión se desactiva.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),

        parameters: [
          { $ref: '#/components/parameters/AllowedOrigin' },
          { $ref: '#/components/parameters/RefreshTokenCookie' },
        ],

        responses: {
          '200': {
            description: 'Sesión renovada y cookies de autenticación rotadas.',
            headers: {
              'Set-Cookie': {
                description: [
                  'Se envía una vez para el nuevo `accessToken` y otra para el nuevo `refreshToken`.',
                  'Ambas cookies son `HttpOnly`, usan `SameSite=Lax` y son `Secure` en producción.',
                ].join(' '),
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshSuccess' },
                example: {
                  success: true,
                  message: 'Token renovado exitosamente',
                },
              },
            },
          },

          '401': {
            description: 'No se proporcionó un refresh token o este es inválido, expiró, fue revocado, ya se usó o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                examples: {
                  missingRefreshToken: {
                    value: {
                      success: false,
                      message: 'Refresh token requerido',
                    },
                  },
                  expiredRefreshToken: {
                    value: {
                      success: false,
                      message: 'Refresh token expirado',
                    },
                  },
                  reusedRefreshToken: {
                    value: {
                      success: false,
                      message: 'Token reutilizado. Inicia sesión nuevamente.',
                    },
                  },
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
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        operationId: 'logoutUser',
        summary: 'Cerrar la sesión actual',
        description: [
          'Revoca el refresh token de la sesión actual cuando está presente y elimina las cookies de autenticación.',
          'La operación es idempotente: responde correctamente aunque no haya una sesión activa.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),

        parameters: [
          { $ref: '#/components/parameters/AllowedOrigin' },
        ],

        responses: {
          '200': {
            description: 'Sesión cerrada y cookies de autenticación eliminadas.',
            headers: {
              'Set-Cookie': {
                description: 'Elimina las cookies HTTP-only `accessToken` y `refreshToken`.',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LogoutSuccess' },
                example: {
                  success: true,
                  message: 'Sesión cerrada exitosamente',
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

          '500': {
            description: 'Error al cerrar sesión o configuración CSRF ausente.',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/ApiError' },
                    { $ref: '#/components/schemas/CsrfConfigurationError' },
                  ],
                },
                examples: {
                  logoutError: {
                    value: {
                      success: false,
                      message: 'Error al cerrar sesión',
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
    '/api/auth/logout-all': {
      post: {
        tags: ['Auth'],
        operationId: 'logoutAllUserSessions',
        summary: 'Cerrar todas las sesiones',
        description: [
          'Revoca los refresh tokens y desactiva todas las sesiones del usuario autenticado.',
          'Si no existe la cookie `refreshToken`, cierra las cookies del navegador y responde que se cerraron 0 sesiones.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/AllowedOrigin' },
          { $ref: '#/components/parameters/RefreshTokenCookie' },
        ],

        responses: {
          '200': {
            description: 'Todas las sesiones activas del usuario fueron cerradas.',
            headers: {
              'Set-Cookie': {
                description: 'Elimina las cookies HTTP-only `accessToken` y `refreshToken`.',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LogoutAllSuccess' },
                example: {
                  success: true,
                  message: 'Se cerraron 3 sesiones correctamente',
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
                },
              },
            },
          },

          '403': {
            description: 'El Origin no está permitido o el refresh token pertenece a otro usuario.',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/CsrfError' },
                    { $ref: '#/components/schemas/ApiError' },
                  ],
                },
                examples: {
                  invalidOrigin: {
                    value: {
                      code: 'INVALID_ORIGIN',
                      message: 'Origen no permitido',
                    },
                  },
                  forbiddenRefreshToken: {
                    value: {
                      success: false,
                      message: 'No autorizado para cerrar estas sesiones',
                    },
                  },
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
                },
              },
            },
          },

          '500': {
            description: 'Error al cerrar las sesiones o configuración CSRF ausente.',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/ApiError' },
                    { $ref: '#/components/schemas/CsrfConfigurationError' },
                  ],
                },
                examples: {
                  logoutError: {
                    value: {
                      success: false,
                      message: 'Error al cerrar todas las sesiones',
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
    '/api/periods': {
      post: {
        tags: ['Periods'],
        operationId: 'createPeriod',
        summary: 'Crear un período académico',
        description: [
          'Crea un período académico para el usuario autenticado.',
          'La fecha de inicio debe ser anterior a la fecha de finalización.',
          'El color debe usar el formato hexadecimal `#RRGGBB`.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/AllowedOrigin' },
        ],

        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: periodJsonSchema,
              example: {
                name: 'Otoño 2026',
                startDate: '2026-08-17',
                endDate: '2026-12-12',
                color: '#2563EB',
              },
            },
          },
        },

        responses: {
          '201': {
            description: 'Período académico creado correctamente.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreatePeriodSuccess' },
                example: {
                  success: true,
                  message: 'Periodo creado correctamente.',
                  data: {
                    id: 12,
                    name: 'Otoño 2026',
                    startDate: '2026-08-17',
                    endDate: '2026-12-12',
                    color: '#2563EB',
                    userId: 7,
                    createdAt: '2026-08-01T14:30:00.000Z',
                  },
                },
              },
            },
          },

          '400': {
            description: 'Datos del período inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'La fecha de inicio debe ser anterior a la fecha de finalización.',
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
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
            description: 'Ya existe un período con ese nombre para el usuario.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Ya existe un periodo con ese nombre.',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
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
                      message: 'Error interno del servidor.',
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
      get: {
        tags: ['Periods'],
        operationId: 'listPeriods',
        summary: 'Obtener los períodos académicos',
        description: 'Devuelve todos los períodos académicos que pertenecen al usuario autenticado.',
        security: [
          { cookieAuth: [] },
        ],

        responses: {
          '200': {
            description: 'Lista de períodos académicos del usuario. Puede estar vacía.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PeriodListSuccess' },
                example: {
                  success: true,
                  data: [
                    {
                      id: 12,
                      name: 'Otoño 2026',
                      startDate: '2026-08-17',
                      endDate: '2026-12-12',
                      color: '#2563EB',
                      userId: 7,
                      createdAt: '2026-08-01T14:30:00.000Z',
                    },
                  ],
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
                },
              },
            },
          },

          '500': {
            description: 'Error interno del servidor al obtener los períodos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Error interno del servidor.',
                },
              },
            },
          },
        },
      },
    },
    '/api/periods/{periodId}': {
      delete: {
        tags: ['Periods'],
        operationId: 'deletePeriod',
        summary: 'Eliminar un período académico',
        description: [
          'Elimina un período académico únicamente si pertenece al usuario autenticado.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/PeriodId' },
          { $ref: '#/components/parameters/AllowedOrigin' },
        ],

        responses: {
          '200': {
            description: 'Período académico eliminado correctamente.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeletePeriodSuccess' },
                example: {
                  success: true,
                  message: 'Periodo eliminado correctamente.',
                },
              },
            },
          },

          '400': {
            description: 'El identificador del período no es un entero positivo válido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El ID del período no es válido.',
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
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

          '404': {
            description: 'El período no existe o no pertenece al usuario autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El periodo no existe o no te pertenece.',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
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
                      message: 'Error interno del servidor.',
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
      put: {
        tags: ['Periods'],
        operationId: 'updatePeriod',
        summary: 'Actualizar un período académico',
        description: [
          'Reemplaza los datos de un período académico que pertenece al usuario autenticado.',
          'Debes enviar todos los campos; la fecha de inicio debe ser anterior a la fecha de finalización.',
          'El color debe usar el formato hexadecimal `#RRGGBB`.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/PeriodId' },
          { $ref: '#/components/parameters/AllowedOrigin' },
        ],

        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: periodJsonSchema,
              example: {
                name: 'Primavera 2027',
                startDate: '2027-01-11',
                endDate: '2027-05-15',
                color: '#7C3AED',
              },
            },
          },
        },

        responses: {
          '200': {
            description: 'Período académico actualizado correctamente.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdatePeriodSuccess' },
                example: {
                  success: true,
                  message: 'Periodo actualizado correctamente.',
                  data: {
                    id: 12,
                    name: 'Primavera 2027',
                    startDate: '2027-01-11',
                    endDate: '2027-05-15',
                    color: '#7C3AED',
                    userId: 7,
                    createdAt: '2026-08-01T14:30:00.000Z',
                  },
                },
              },
            },
          },

          '400': {
            description: 'El identificador o los datos enviados son inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                examples: {
                  emptyBody: {
                    value: {
                      success: false,
                      message: 'Debes enviar al menos un campo para actualizar.',
                    },
                  },
                  invalidDateRange: {
                    value: {
                      success: false,
                      message: 'La fecha de inicio debe ser anterior a la fecha de finalización.',
                    },
                  },
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
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

          '404': {
            description: 'El período no existe o no pertenece al usuario autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El periodo no existe o no te pertenece.',
                },
              },
            },
          },

          '409': {
            description: 'Ya existe otro período con ese nombre para el usuario.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Ya existe un periodo con ese nombre.',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
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
                      message: 'Error interno del servidor.',
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
      get: {
        tags: ['Periods'],
        operationId: 'getPeriod',
        summary: 'Obtener un período académico',
        description: 'Devuelve un período académico únicamente si pertenece al usuario autenticado.',
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/PeriodId' },
        ],

        responses: {
          '200': {
            description: 'Período académico encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PeriodSuccess' },
                example: {
                  success: true,
                  data: {
                    id: 12,
                    name: 'Otoño 2026',
                    startDate: '2026-08-17',
                    endDate: '2026-12-12',
                    color: '#2563EB',
                    userId: 7,
                    createdAt: '2026-08-01T14:30:00.000Z',
                  },
                },
              },
            },
          },

          '400': {
            description: 'El identificador del período no es un entero positivo válido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El ID del período no es válido.',
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
                },
              },
            },
          },

          '404': {
            description: 'El período no existe o no pertenece al usuario autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El periodo no existe o no te pertenece.',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
                },
              },
            },
          },

          '500': {
            description: 'Error interno del servidor al obtener el período.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Error interno del servidor.',
                },
              },
            },
          },
        },
      },
    },
    '/api/periods/{periodId}/subjects': {
      post: {
        tags: ['Subjects'],
        operationId: 'createSubject',
        summary: 'Crear una materia en un período',
        description: [
          'Crea una materia y, opcionalmente, sus clases dentro de un período del usuario autenticado.',
          'El nombre del maestro es opcional; si se omite o está vacío se guarda como `null`.',
          'El tipo de cada clase admite `theory`, `laboratory` o `workshop`; la modalidad admite `onsite` u `online`.',
          'Las fechas de la materia deben permanecer dentro del período y la fecha de inicio debe ser anterior a la de término.',
          'El color debe usar el formato hexadecimal `#RRGGBB`.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/PeriodId' },
          { $ref: '#/components/parameters/AllowedOrigin' },
        ],

        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: createSubjectJsonSchema,
              example: {
                name: 'Cálculo diferencial',
                teacher: 'María López',
                color: '#7C3AED',
                startDate: '2026-08-17',
                endDate: '2026-12-12',
                classes: [
                  {
                    days: [1, 3, 5],
                    type: 'theory',
                    mode: 'onsite',
                    classroom: 'A-203',
                    startTime: '09:00',
                    endTime: '10:00',
                  },
                ],
              },
            },
          },
        },

        responses: {
          '201': {
            description: 'Materia y clases opcionales creadas correctamente.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateSubjectSuccess' },
                example: {
                  success: true,
                  message: 'Materia creada correctamente.',
                  subject: {
                    id: 31,
                    periodId: 12,
                    name: 'Cálculo diferencial',
                    teacher: 'María López',
                    color: '#7C3AED',
                    startDate: '2026-08-17',
                    endDate: '2026-12-12',
                    createdAt: null,
                    updatedAt: null,
                  },
                  classes: [
                    {
                      days: [1, 3, 5],
                      type: 'theory',
                      mode: 'onsite',
                      classroom: 'A-203',
                      startTime: '09:00',
                      endTime: '10:00',
                    },
                  ],
                },
              },
            },
          },

          '400': {
            description: 'El identificador, los datos de la materia o sus clases son inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                examples: {
                  invalidDateRange: {
                    value: {
                      success: false,
                      message: 'La fecha de inicio debe ser anterior a la fecha de término.',
                    },
                  },
                  subjectOutsidePeriod: {
                    value: {
                      success: false,
                      message: 'Las fechas de la materia deben estar dentro del periodo académico.',
                    },
                  },
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
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

          '404': {
            description: 'El período no existe o no pertenece al usuario autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El periodo no existe o no te pertenece.',
                },
              },
            },
          },

          '409': {
            description: 'Ya existe una materia con ese nombre en el período.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Ya existe una materia con ese nombre en este periodo.',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
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
                      message: 'Error interno del servidor.',
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
      get: {
        tags: ['Subjects'],
        operationId: 'listSubjectsByPeriod',
        summary: 'Obtener las materias de un período',
        description: 'Devuelve todas las materias del período únicamente si este pertenece al usuario autenticado.',
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/PeriodId' },
        ],

        responses: {
          '200': {
            description: 'Lista de materias del período. Puede estar vacía.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SubjectListSuccess' },
                example: {
                  success: true,
                  data: [
                    {
                      id: 31,
                      periodId: 12,
                      name: 'Cálculo diferencial',
                      teacher: 'María López',
                      color: '#7C3AED',
                      startDate: '2026-08-17',
                      endDate: '2026-12-12',
                      createdAt: '2026-08-02T10:00:00.000Z',
                      updatedAt: null,
                    },
                  ],
                },
              },
            },
          },

          '400': {
            description: 'El identificador del período no es un entero positivo válido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El ID del período no es válido.',
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
                },
              },
            },
          },

          '404': {
            description: 'El período no existe o no pertenece al usuario autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El periodo no existe o no te pertenece.',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
                },
              },
            },
          },

          '500': {
            description: 'Error interno del servidor al obtener las materias.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Error interno del servidor.',
                },
              },
            },
          },
        },
      },
    },
    '/api/periods/{periodId}/classes': {
      get: {
        tags: ['Subjects'],
        operationId: 'listClassesByPeriod',
        summary: 'Obtener las clases de un período',
        description: 'Devuelve las clases de todas las materias del período únicamente si este pertenece al usuario autenticado.',
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/PeriodId' },
        ],

        responses: {
          '200': {
            description: 'Lista de clases del período. Puede estar vacía.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ClassListSuccess' },
                example: {
                  success: true,
                  data: [
                    {
                      id: 81,
                      subjectId: 31,
                      subjectName: 'Cálculo diferencial',
                      days: [1, 3, 5],
                      type: 'theory',
                      mode: 'onsite',
                      classroom: 'A-203',
                      startTime: '09:00',
                      endTime: '10:00',
                    },
                  ],
                },
              },
            },
          },

          '400': {
            description: 'El identificador del período no es un entero positivo válido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El ID del período no es válido.',
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
                },
              },
            },
          },

          '404': {
            description: 'El período no existe o no pertenece al usuario autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El periodo no existe o no te pertenece.',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
                },
              },
            },
          },

          '500': {
            description: 'Error interno del servidor al obtener las clases.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Error interno del servidor.',
                },
              },
            },
          },
        },
      },
    },
    '/api/subjects/{subjectId}': {
      delete: {
        tags: ['Subjects'],
        operationId: 'deleteSubject',
        summary: 'Eliminar una materia',
        description: [
          'Elimina una materia únicamente si pertenece al usuario autenticado.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/SubjectId' },
          { $ref: '#/components/parameters/AllowedOrigin' },
        ],

        responses: {
          '200': {
            description: 'Materia eliminada correctamente.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeleteSubjectSuccess' },
                example: {
                  success: true,
                  message: 'Materia eliminada correctamente.',
                },
              },
            },
          },

          '400': {
            description: 'El identificador de la materia no es un entero positivo válido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El ID de la materia no es válido.',
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
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

          '404': {
            description: 'La materia no existe o no pertenece al usuario autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'La materia no existe o no te pertenece.',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
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
                      message: 'Error interno del servidor.',
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
      put: {
        tags: ['Subjects'],
        operationId: 'updateSubject',
        summary: 'Actualizar una materia y sus clases',
        description: [
          'Actualiza una materia del usuario autenticado y aplica en una sola transacción las clases nuevas, modificadas y eliminadas.',
          'Debes enviar todos los campos de la materia, la lista completa de clases a crear o actualizar y `deletedClassIds` para las clases a eliminar.',
          'El maestro es opcional; en cada clase, `id` es opcional (omítelo para crearla) y `classroom` es opcional o `null`.',
          'El tipo de cada clase admite `theory`, `laboratory` o `workshop`; la modalidad admite `onsite` u `online`.',
          'Las clases con modalidad `online` no pueden incluir salón.',
          'La materia debe permanecer dentro de las fechas de su período y el color debe usar el formato hexadecimal `#RRGGBB`.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/SubjectId' },
          { $ref: '#/components/parameters/AllowedOrigin' },
        ],

        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: updateSubjectJsonSchema,
              example: {
                name: 'Cálculo integral',
                teacher: 'María López',
                color: '#7C3AED',
                startDate: '2026-08-17',
                endDate: '2026-12-12',
                classes: [
                  {
                    id: 81,
                    days: [1, 3, 5],
                    type: 'theory',
                    mode: 'onsite',
                    classroom: 'A-204',
                    startTime: '09:00',
                    endTime: '10:00',
                  },
                  {
                    days: [2],
                    type: 'laboratory',
                    mode: 'online',
                    classroom: null,
                    startTime: '11:00',
                    endTime: '12:30',
                  },
                ],
                deletedClassIds: [82],
              },
            },
          },
        },

        responses: {
          '200': {
            description: 'Materia y cambios de clases aplicados correctamente.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateSubjectSuccess' },
                example: {
                  success: true,
                  message: 'Materia actualizada correctamente.',
                  updatedSubject: {
                    id: 31,
                    periodId: 12,
                    name: 'Cálculo integral',
                    teacher: 'María López',
                    color: '#7C3AED',
                    startDate: '2026-08-17',
                    endDate: '2026-12-12',
                    createdAt: '2026-08-02T10:00:00.000Z',
                    updatedAt: '2026-08-10T16:15:00.000Z',
                  },
                  insertedClasses: [
                    {
                      id: 83,
                      subjectId: 31,
                      days: [2],
                      type: 'laboratory',
                      mode: 'online',
                      classroom: null,
                      startTime: '11:00',
                      endTime: '12:30',
                    },
                  ],
                  updatedClasses: [
                    {
                      id: 81,
                      subjectId: 31,
                      days: [1, 3, 5],
                      type: 'theory',
                      mode: 'onsite',
                      classroom: 'A-204',
                      startTime: '09:00',
                      endTime: '10:00',
                    },
                  ],
                  deletedClasses: [82],
                },
              },
            },
          },

          '400': {
            description: 'El identificador, los datos de la materia o sus clases son inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                examples: {
                  invalidDateRange: {
                    value: {
                      success: false,
                      message: 'La fecha de inicio debe ser anterior a la fecha de término.',
                    },
                  },
                  subjectOutsidePeriod: {
                    value: {
                      success: false,
                      message: 'Las fechas de la materia deben estar dentro del periodo académico.',
                    },
                  },
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
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

          '404': {
            description: 'La materia no existe, no pertenece al usuario o se indicaron clases ajenas a ella.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                examples: {
                  subjectNotFound: {
                    value: {
                      success: false,
                      message: 'La materia no existe o no te pertenece.',
                    },
                  },
                  classNotFound: {
                    value: {
                      success: false,
                      message: 'Una o más clases no pertenecen a la materia.',
                    },
                  },
                },
              },
            },
          },

          '409': {
            description: 'La actualización infringe una restricción de unicidad.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El recurso ya existe.',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
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
                      message: 'Error interno del servidor.',
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
    '/api/subjects/{subjectId}/with-classes': {
      get: {
        tags: ['Subjects'],
        operationId: 'getSubjectWithClasses',
        summary: 'Obtener una materia con sus clases',
        description: 'Devuelve una materia y todas sus clases únicamente si pertenece al usuario autenticado.',
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/SubjectId' },
        ],

        responses: {
          '200': {
            description: 'Materia encontrada con sus clases. La lista de clases puede estar vacía.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SubjectWithClassesSuccess' },
                example: {
                  success: true,
                  data: {
                    id: 31,
                    periodId: 12,
                    name: 'Cálculo diferencial',
                    teacher: 'María López',
                    color: '#7C3AED',
                    startDate: '2026-08-17',
                    endDate: '2026-12-12',
                    createdAt: '2026-08-02T10:00:00.000Z',
                    updatedAt: null,
                    classes: [
                      {
                        id: 81,
                        subjectId: 31,
                        days: [1, 3, 5],
                        type: 'theory',
                        mode: 'onsite',
                        classroom: 'A-203',
                        startTime: '09:00',
                        endTime: '10:00',
                      },
                    ],
                  },
                },
              },
            },
          },

          '400': {
            description: 'El identificador de la materia no es un entero positivo válido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'El ID de la materia no es válido.',
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
                },
              },
            },
          },

          '404': {
            description: 'La materia no existe o no pertenece al usuario autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'La materia no existe o no te pertenece.',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
                },
              },
            },
          },

          '500': {
            description: 'Error interno del servidor al obtener la materia.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Error interno del servidor.',
                },
              },
            },
          },
        },
      },
    },
    '/api/subjects/{subjectId}/classes': {
      post: {
        tags: ['Subjects'],
        operationId: 'createSubjectClasses',
        summary: 'Crear clases para una materia',
        description: [
          'Crea una o más clases para una materia que pertenece al usuario autenticado.',
          'Cada clase debe tener al menos un día, un tipo (`theory`, `laboratory` o `workshop`) y una modalidad (`onsite` u `online`).',
          'El salón es opcional, pero debe omitirse o ser `null` cuando la modalidad es `online`.',
          'Como toda operación que modifica datos bajo `/api`, requiere un encabezado `Origin` permitido.',
        ].join(' '),
        security: [
          { cookieAuth: [] },
        ],

        parameters: [
          { $ref: '#/components/parameters/SubjectId' },
          { $ref: '#/components/parameters/AllowedOrigin' },
        ],

        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: createClassesJsonSchema,
              example: {
                classes: [
                  {
                    days: [1, 3, 5],
                    type: 'theory',
                    mode: 'onsite',
                    classroom: 'A-203',
                    startTime: '09:00',
                    endTime: '10:00',
                  },
                  {
                    days: [2],
                    type: 'laboratory',
                    mode: 'online',
                    classroom: null,
                    startTime: '11:00',
                    endTime: '12:30',
                  },
                ],
              },
            },
          },
        },

        responses: {
          '201': {
            description: 'Clases creadas correctamente.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateClassesSuccess' },
                example: {
                  success: true,
                  message: 'Clases creadas correctamente.',
                  classes: [
                    {
                      id: 81,
                      subjectId: 31,
                      days: [1, 3, 5],
                      type: 'theory',
                      mode: 'onsite',
                      classroom: 'A-203',
                      startTime: '09:00',
                      endTime: '10:00',
                    },
                    {
                      id: 82,
                      subjectId: 31,
                      days: [2],
                      type: 'laboratory',
                      mode: 'online',
                      classroom: null,
                      startTime: '11:00',
                      endTime: '12:30',
                    },
                  ],
                },
              },
            },
          },

          '400': {
            description: 'El identificador o las clases enviadas son inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                examples: {
                  emptyClasses: {
                    value: {
                      success: false,
                      message: 'Debes enviar al menos una clase.',
                    },
                  },
                  invalidTimeRange: {
                    value: {
                      success: false,
                      message: 'La hora de término debe ser posterior a la hora de inicio.',
                    },
                  },
                },
              },
            },
          },

          '401': {
            description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthenticationError' },
                example: {
                  code: 'NO_ACCESS_TOKEN',
                  message: 'Acceso denegado',
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

          '404': {
            description: 'La materia no existe o no pertenece al usuario autenticado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'La materia no existe o no te pertenece.',
                },
              },
            },
          },

          '503': {
            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },
                example: {
                  code: 'AUTH_SERVICE_UNAVAILABLE',
                  message: 'El servicio de autenticación no está disponible',
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
                      message: 'Error interno del servidor.',
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
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description: 'Cookie HTTP-only emitida al iniciar sesión. El navegador la envía automáticamente.',
      },
    },
    parameters: {
      AllowedOrigin: {
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
      RefreshTokenCookie: {
        name: 'refreshToken',
        in: 'cookie',
        required: false,
        description: 'Cookie HTTP-only emitida al iniciar sesión. Se usa para localizar las sesiones que se revocarán.',
        schema: { type: 'string' },
      },
      PeriodId: {
        name: 'periodId',
        in: 'path',
        required: true,
        description: 'Identificador entero positivo del período académico.',
        schema: {
          type: 'integer',
          format: 'int32',
          minimum: 1,
        },
        example: 12,
      },
      SubjectId: {
        name: 'subjectId',
        in: 'path',
        required: true,
        description: 'Identificador entero positivo de la materia.',
        schema: {
          type: 'integer',
          format: 'int32',
          minimum: 1,
        },
        example: 31,
      },
    },
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
      Period: {
        type: 'object',
        required: [
          'id',
          'name',
          'startDate',
          'endDate',
          'color',
          'userId',
          'createdAt',
        ],
        properties: {
          id: { type: 'integer', example: 12 },
          name: { type: 'string', example: 'Otoño 2026' },
          startDate: { type: 'string', format: 'date', example: '2026-08-17' },
          endDate: { type: 'string', format: 'date', example: '2026-12-12' },
          color: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            description: 'Color hexadecimal en formato `#RRGGBB`.',
            example: '#2563EB',
          },
          userId: { type: 'integer', example: 7 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Subject: {
        type: 'object',
        required: [
          'id',
          'periodId',
          'name',
          'teacher',
          'color',
          'startDate',
          'endDate',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'integer', example: 31 },
          periodId: { type: 'integer', example: 12 },
          name: { type: 'string', example: 'Cálculo diferencial' },
          teacher: {
            description: 'Nombre del maestro. Es opcional y puede ser `null`.',
            anyOf: [
              { type: 'string', example: 'María López' },
              { type: 'null' },
            ],
          },
          color: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            description: 'Color hexadecimal en formato `#RRGGBB`.',
            example: '#7C3AED',
          },
          startDate: { type: 'string', format: 'date', example: '2026-08-17' },
          endDate: { type: 'string', format: 'date', example: '2026-12-12' },
          createdAt: {
            anyOf: [
              { type: 'string', format: 'date-time' },
              { type: 'null' },
            ],
          },
          updatedAt: {
            anyOf: [
              { type: 'string', format: 'date-time' },
              { type: 'null' },
            ],
          },
        },
      },
      SubjectListSuccess: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Subject' },
          },
        },
      },
      SubjectWithClasses: {
        allOf: [
          { $ref: '#/components/schemas/Subject' },
          {
            type: 'object',
            required: ['classes'],
            properties: {
              classes: {
                type: 'array',
                items: { $ref: '#/components/schemas/Class' },
              },
            },
          },
        ],
      },
      SubjectWithClassesSuccess: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          data: { $ref: '#/components/schemas/SubjectWithClasses' },
        },
      },
      Class: {
        type: 'object',
        required: ['days', 'startTime', 'endTime', 'mode', 'classroom', 'type'],
        properties: {
          id: {
            type: 'integer',
            description: 'Opcional en solicitudes de actualización; omítelo para crear una clase nueva.',
            example: 81,
          },
          subjectId: { type: 'integer', example: 31 },
          subjectName: { type: 'string', example: 'Cálculo diferencial' },
          days: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: { type: 'integer', minimum: 1, maximum: 7 },
            example: [1, 3, 5],
          },
          startTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', example: '09:00' },
          endTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', example: '10:00' },
          mode: { type: 'string', enum: ['onsite', 'online'], example: 'onsite' },
          classroom: {
            description: 'Opcional. Debe omitirse o ser `null` cuando la modalidad es `online`.',
            anyOf: [
              { type: 'string', maxLength: 10, example: 'A-203' },
              { type: 'null' },
            ],
          },
          type: {
            type: 'string',
            enum: ['theory', 'laboratory', 'workshop'],
            description: 'Tipo de clase: `theory`, `laboratory` o `workshop`.',
            example: 'theory',
          },
        },
      },
      CreateSubjectSuccess: {
        type: 'object',
        required: ['success', 'message', 'subject'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Materia creada correctamente.' },
          subject: { $ref: '#/components/schemas/Subject' },
          classes: {
            type: 'array',
            items: { $ref: '#/components/schemas/Class' },
            description: 'Solo se incluye cuando se enviaron clases en la solicitud.',
          },
        },
      },
      UpdateSubjectSuccess: {
        type: 'object',
        required: [
          'success',
          'message',
          'updatedSubject',
          'insertedClasses',
          'updatedClasses',
          'deletedClasses',
        ],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Materia actualizada correctamente.' },
          updatedSubject: { $ref: '#/components/schemas/Subject' },
          insertedClasses: {
            type: 'array',
            items: { $ref: '#/components/schemas/Class' },
          },
          updatedClasses: {
            type: 'array',
            items: { $ref: '#/components/schemas/Class' },
          },
          deletedClasses: {
            type: 'array',
            items: { type: 'integer' },
          },
        },
      },
      DeleteSubjectSuccess: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Materia eliminada correctamente.' },
        },
      },
      CreateClassesSuccess: {
        type: 'object',
        required: ['success', 'message', 'classes'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Clases creadas correctamente.' },
          classes: {
            type: 'array',
            items: { $ref: '#/components/schemas/Class' },
          },
        },
      },
      ClassListSuccess: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Class' },
          },
        },
      },
      PeriodListSuccess: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Period' },
          },
        },
      },
      PeriodSuccess: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          data: { $ref: '#/components/schemas/Period' },
        },
      },
      CreatePeriodSuccess: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Periodo creado correctamente.' },
          data: { $ref: '#/components/schemas/Period' },
        },
      },
      UpdatePeriodSuccess: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Periodo actualizado correctamente.' },
          data: { $ref: '#/components/schemas/Period' },
        },
      },
      DeletePeriodSuccess: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Periodo eliminado correctamente.' },
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
      LoginSuccess: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', example: 'Login exitoso' },
          data: {
            type: 'object',
            required: ['user', 'session'],
            properties: {
              user: { $ref: '#/components/schemas/User' },
              session: {
                type: 'object',
                required: ['id'],
                properties: {
                  id: { type: 'integer', example: 19 },
                },
              },
            },
          },
        },
      },
      CurrentUserSuccess: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            required: ['user'],
            properties: {
              user: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
      LogoutSuccess: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Sesión cerrada exitosamente' },
        },
      },
      LogoutAllSuccess: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', const: true },
          message: {
            type: 'string',
            pattern: '^Se cerraron [0-9]+ sesiones correctamente$',
            example: 'Se cerraron 3 sesiones correctamente',
          },
        },
      },
      RefreshSuccess: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Token renovado exitosamente' },
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
      AuthenticationError: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: {
            type: 'string',
            enum: [
              'NO_ACCESS_TOKEN',
              'INVALID_SESSION_TOKEN',
              'SESSION_INACTIVE',
              'ACCESS_TOKEN_EXPIRED',
              'INVALID_ACCESS_TOKEN',
            ],
          },
          message: { type: 'string' },
        },
      },
      AuthServiceUnavailable: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', const: 'AUTH_SERVICE_UNAVAILABLE' },
          message: { type: 'string', const: 'El servicio de autenticación no está disponible' },
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
