import { z } from 'zod';
import { loginSchema, registerSchema } from '../modules/auth/auth.schemas.js';
import { periodSchema } from '../modules/periods/periods.schemas.js';

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
