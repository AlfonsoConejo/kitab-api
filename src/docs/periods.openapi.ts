import { periodJsonSchema } from './openapi.schemas.js';

export const periodPaths = {
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
            content: {              'application/json': {
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
                    startDate: '2027-01-11',                    endDate: '2027-05-15',
                    color: '#7C3AED',                    userId: 7,
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
          '503': {            description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
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
};


