import { dayOffJsonSchema } from './openapi.schemas.js';

const example = {
  id: 25,
  periodId: 12,
  name: 'Consejo técnico',
  type: 'day_off',
  startDate: '2026-09-10',
  endDate: '2026-09-10',
  notes: 'Suspensión de actividades.',
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
};

const auth = {
  '401': {
    description: 'La cookie de acceso no existe, es inválida, expiró o pertenece a una sesión inactiva.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthenticationError' } } },
  },
  '503': {
    description: 'No fue posible comprobar que la sesión asociada al access token siga activa.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthServiceUnavailable' } } },
  },
};

const csrf = {
  '403': {
    description: 'El encabezado Origin falta o no está permitido.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CsrfError' },
        example: { code: 'INVALID_ORIGIN', message: 'Origen no permitido' },
      },
    },
  },
};

const serverError = {
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
            value: { success: false, message: 'Error interno del servidor.' },
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
};

const internalServerError = {
  '500': {
    description: 'Error interno del servidor.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
        example: { success: false, message: 'Error interno del servidor.' },
      },
    },
  },
};

const invalidDayOff = {
  '400': {
    description: 'Los datos del descanso son inválidos.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
        example: {
          success: false,
          message: 'Las fechas del descanso deben estar dentro del período académico.',
        },
      },
    },
  },
};

const invalidDayOffId = {
  '400': {
    description: 'El identificador del descanso no es un entero positivo válido.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
        example: { success: false, message: 'El ID del descanso no es válido.' },
      },
    },
  },
};

const invalidDayOffUpdate = {
  '400': {
    description: 'El identificador o los datos del descanso son inválidos.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
        examples: {
          invalidId: {
            value: { success: false, message: 'El ID del descanso no es válido.' },
          },
          invalidDates: {
            value: {
              success: false,
              message: 'Las fechas del descanso deben estar dentro del período académico.',
            },
          },
        },
      },
    },
  },
};

export const daysOffPaths = {
  '/api/periods/{periodId}/days-off': {
    get: {
      tags: ['Days Off'],
      operationId: 'listDaysOffByPeriod',
      summary: 'Obtener los descansos de un período',
      description: 'Devuelve los días libres y períodos vacacionales de un período perteneciente al usuario autenticado.',
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/PeriodId' }],
      responses: {
        '200': {
          description: 'Lista de descansos del período. Puede estar vacía.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DayOffListSuccess' },
              example: { success: true, data: [example] },
            },
          },
        },
        '400': {
          description: 'El identificador del período no es válido.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { success: false, message: 'El ID del período no es válido.' },
            },
          },
        },
        ...auth,
        '404': {
          description: 'El período no existe o no pertenece al usuario autenticado.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { success: false, message: 'El período no existe o no te pertenece.' },
            },
          },
        },
        ...internalServerError,
      },
    },
    post: {
      tags: ['Days Off'],
      operationId: 'createDayOff',
      summary: 'Crear un descanso en un período',
      description: 'Crea un día libre o período vacacional dentro de un período del usuario. Las fechas deben quedar dentro de ese período.',
      security: [{ cookieAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PeriodId' },
        { $ref: '#/components/parameters/AllowedOrigin' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: dayOffJsonSchema,
            example: {
              name: 'Vacaciones de invierno',
              type: 'vacation',
              startDate: '2026-12-21',
              endDate: '2026-12-31',
              notes: 'No habrá actividades académicas.',
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Descanso creado correctamente.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDayOffSuccess' },
              example: { success: true, message: 'Descanso creado correctamente.', data: example },
            },
          },
        },
        ...invalidDayOff,
        ...auth,
        ...csrf,
        '404': {
          description: 'El período no existe o no pertenece al usuario autenticado.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { success: false, message: 'El período no existe o no te pertenece.' },
            },
          },
        },
        ...serverError,
      },
    },
  },
  '/api/days-off/{dayOffId}': {
    get: {
      tags: ['Days Off'],
      operationId: 'getDayOffById',
      summary: 'Obtener un descanso',
      description: 'Obtiene un descanso por ID e infiere su período para comprobar la propiedad.',
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/DayOffId' }],
      responses: {
        '200': {
          description: 'Descanso obtenido correctamente.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DayOffSuccess' },
              example: { success: true, data: example },
            },
          },
        },
        ...invalidDayOffId,
        ...auth,
        '404': {
          description: 'El descanso no existe o no pertenece al usuario autenticado.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { success: false, message: 'El descanso no existe o no te pertenece.' },
            },
          },
        },
        ...internalServerError,
      },
    },
    put: {
      tags: ['Days Off'],
      operationId: 'updateDayOff',
      summary: 'Actualizar un descanso',
      description: 'Actualiza un descanso por ID e infiere su período para validar las fechas y comprobar la propiedad.',
      security: [{ cookieAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/DayOffId' },
        { $ref: '#/components/parameters/AllowedOrigin' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: dayOffJsonSchema,
            example: {
              name: 'Vacaciones de invierno',
              type: 'vacation',
              startDate: '2026-12-21',
              endDate: '2026-12-31',
              notes: null,
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Descanso actualizado correctamente.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateDayOffSuccess' },
              example: { success: true, message: 'Descanso actualizado correctamente.', data: example },
            },
          },
        },
        ...invalidDayOffUpdate,
        ...auth,
        ...csrf,
        '404': {
          description: 'El descanso no existe o no pertenece al usuario autenticado.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { success: false, message: 'El descanso no existe o no te pertenece.' },
            },
          },
        },
        ...serverError,
      },
    },
    delete: {
      tags: ['Days Off'],
      operationId: 'deleteDayOff',
      summary: 'Eliminar un descanso',
      description: 'Elimina un descanso por ID después de inferir su período y comprobar la propiedad.',
      security: [{ cookieAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/DayOffId' },
        { $ref: '#/components/parameters/AllowedOrigin' },
      ],
      responses: {
        '200': {
          description: 'Descanso eliminado correctamente.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DeleteDayOffSuccess' },
              example: { success: true, message: 'Descanso eliminado correctamente.' },
            },
          },
        },
        ...invalidDayOffId,
        ...auth,
        ...csrf,
        '404': {
          description: 'El descanso no existe o no pertenece al usuario autenticado.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { success: false, message: 'El descanso no existe o no te pertenece.' },
            },
          },
        },
        ...serverError,
      },
    },
  },
};
