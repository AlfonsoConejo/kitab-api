import { loginJsonSchema, registerJsonSchema } from './openapi.schemas.js';

export const authPaths = {
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
                },              },
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

          '401': {            description: 'No se proporcionó un refresh token o este es inválido, expiró, fue revocado, ya se usó o pertenece a una sesión inactiva.',
            content: {              'application/json': {
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
          '403': {            description: 'El Origin no está permitido o el refresh token pertenece a otro usuario.',
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
};


