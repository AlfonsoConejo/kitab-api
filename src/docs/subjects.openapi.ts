import {
  createClassesJsonSchema,
  createSubjectJsonSchema,
  externalConflictsJsonSchema,
  internalConflictsJsonSchema,
  updateSubjectJsonSchema,
} from './openapi.schemas.js';

export const subjectPaths = {
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
                },              },
            },
          },

          '409': {
            description: 'Ya existe una materia con ese nombre en el período.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },                example: {
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

          '500': {            description: 'Error interno del servidor al obtener las materias.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'Error interno del servidor.',
                },              },
            },
          },
        },
      },
    },
    '/api/periods/{periodId}/classes/conflicts/external': {
      post: {
        tags: ['Subjects'],
        operationId: 'checkExternalClassConflictsByPeriod',
        summary: 'Buscar conflictos externos de clases',
        description: [
          'Compara las clases propuestas contra las clases persistidas de otras materias del período.',
          'Úsalo al crear una materia, cuando todavía no existe un `subjectId` que pueda excluirse.',
          '`id` y `tempId` son opcionales y solo identifican una clase propuesta dentro de la respuesta.',
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
              schema: externalConflictsJsonSchema,
              example: {
                classes: [
                  {
                    tempId: 'new-class-1',
                    days: [1, 3],
                    startTime: '09:30',
                    endTime: '10:30',
                  },
                ],
              },
            },
          },
        },

        responses: {
          '200': {
            description: 'Resultado del análisis. Un arreglo vacío indica que no se encontraron conflictos externos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExternalConflictsSuccess' },
                example: {
                  success: true,
                  externalConflicts: [
                    {
                      id: 'new-class-1',
                      conflictDays: [1, 3],
                      subject: 'Álgebra lineal',
                      startTime: '09:00',
                      endTime: '10:00',
                    },
                  ],
                },
              },
            },
          },

          '400': {
            description: 'El identificador del período o los horarios enviados son inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'La hora de término debe ser posterior a la hora de inicio.',
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
                examples: {                  internalError: {
                    value: {
                      success: false,
                      message: 'Error interno del servidor.',
                    },
                  },
                  csrfNotConfigured: {                    value: {
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
                example: {                  success: true,
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
                    endTime: '12:30',                  },
                ],
                deletedClassIds: [82],
              },
            },          },
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
                  message: 'El servicio de autenticación no está disponible',                },
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
      },    },
    '/api/subjects/{subjectId}/classes': {
      post: {        tags: ['Subjects'],
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
            content: {              'application/json': {
                schema: { $ref: '#/components/schemas/AuthServiceUnavailable' },                example: {
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
    '/api/subjects/{subjectId}/classes/conflicts/external': {
      post: {
        tags: ['Subjects'],
        operationId: 'checkExternalClassConflictsBySubject',
        summary: 'Buscar conflictos externos al editar una materia',
        description: [
          'Compara las clases propuestas contra las clases de otras materias del período de la materia indicada.',
          'La propia materia se excluye de la comparación y el período se infiere desde `subjectId`.',
          '`id` y `tempId` son opcionales y solo identifican una clase propuesta dentro de la respuesta.',
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
              schema: externalConflictsJsonSchema,
              example: {
                classes: [
                  {
                    id: 81,
                    tempId: 'class-81',
                    days: [1, 3],
                    startTime: '09:30',
                    endTime: '10:30',
                  },
                ],
              },
            },
          },
        },

        responses: {
          '200': {
            description: 'Resultado del análisis. Un arreglo vacío indica que no se encontraron conflictos externos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExternalConflictsSuccess' },
                example: {
                  success: true,
                  externalConflicts: [
                    {
                      id: 'class-81',
                      conflictDays: [1, 3],
                      subject: 'Álgebra lineal',
                      startTime: '09:00',
                      endTime: '10:00',
                    },
                  ],
                },
              },
            },
          },

          '400': {
            description: 'El identificador de la materia o los horarios enviados son inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'La hora de término debe ser posterior a la hora de inicio.',
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
              },            },          },

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
    '/api/subjects/classes/conflicts/internal': {
      post: {
        tags: ['Subjects'],
        operationId: 'checkInternalClassConflicts',
        summary: 'Buscar conflictos internos de clases',
        description: [
          'Compara entre sí las clases enviadas en el mismo payload, sin consultar clases persistidas.',
          'Los resultados se ordenan por día y hora de inicio del conflicto.',
          '`id` y `tempId` son opcionales y sirven para identificar cada clase en la respuesta.',
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
              schema: internalConflictsJsonSchema,
              example: {
                classes: [
                  {
                    tempId: 'class-a',
                    days: [1, 3],
                    startTime: '09:00',
                    endTime: '10:00',
                  },
                  {
                    tempId: 'class-b',
                    days: [1, 5],
                    startTime: '09:30',
                    endTime: '10:30',
                  },
                ],
              },
            },
          },
        },

        responses: {
          '200': {
            description: 'Resultado del análisis. Un arreglo vacío indica que no existen conflictos internos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InternalConflictsSuccess' },
                example: {
                  success: true,
                  internalConflicts: [
                    {
                      classA: 'class-a',
                      classB: 'class-b',
                      conflictDays: [1],
                      classAStartTime: '09:00',
                      classAEndTime: '10:00',
                      classBStartTime: '09:30',
                      classBEndTime: '10:30',
                    },
                  ],
                },
              },
            },
          },

          '400': {
            description: 'Las clases u horarios enviados son inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  success: false,
                  message: 'La hora de término debe ser posterior a la hora de inicio.',
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
            },          },
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
};

