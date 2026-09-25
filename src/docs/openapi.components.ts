export const openApiComponents = {
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
      DayOffId: {
        name: 'dayOffId',
        in: 'path',
        required: true,
        description: 'Identificador entero positivo del descanso.',
        schema: {
          type: 'integer',
          format: 'int32',
          minimum: 1,
        },
        example: 25,
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
            minItems: 1,            uniqueItems: true,            items: { type: 'integer', minimum: 1, maximum: 7 },
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
      ExternalConflict: {
        type: 'object',
        required: ['conflictDays', 'subject', 'startTime', 'endTime'],
        properties: {
          id: {
            description: 'El `id` o `tempId` de la clase propuesta, cuando fue enviado.',
            oneOf: [
              { type: 'integer' },
              { type: 'string' },
            ],
          },
          conflictDays: {
            type: 'array',
            items: { type: 'integer', minimum: 1, maximum: 7 },
            example: [1, 3],
          },
          subject: { type: 'string', example: 'Álgebra lineal' },
          startTime: { type: 'string', example: '09:00' },
          endTime: { type: 'string', example: '10:00' },
        },
      },
      ExternalConflictsSuccess: {
        type: 'object',
        required: ['success', 'externalConflicts'],
        properties: {
          success: { type: 'boolean', const: true },
          externalConflicts: {
            type: 'array',
            items: { $ref: '#/components/schemas/ExternalConflict' },
          },
        },
      },
      InternalConflict: {
        type: 'object',
        required: [
          'conflictDays',
          'classAStartTime',
          'classAEndTime',
          'classBStartTime',
          'classBEndTime',
        ],
        properties: {
          classA: {
            description: 'El `id` o `tempId` de la primera clase, cuando fue enviado.',
            oneOf: [
              { type: 'integer' },
              { type: 'string' },
            ],
          },
          classB: {
            description: 'El `id` o `tempId` de la segunda clase, cuando fue enviado.',
            oneOf: [
              { type: 'integer' },
              { type: 'string' },
            ],
          },
          conflictDays: {
            type: 'array',
            items: { type: 'integer', minimum: 1, maximum: 7 },
            example: [1, 3],
          },
          classAStartTime: { type: 'string', example: '09:00' },
          classAEndTime: { type: 'string', example: '10:00' },
          classBStartTime: { type: 'string', example: '09:30' },
          classBEndTime: { type: 'string', example: '10:30' },
        },
      },
      InternalConflictsSuccess: {
        type: 'object',
        required: ['success', 'internalConflicts'],
        properties: {
          success: { type: 'boolean', const: true },
          internalConflicts: {
            type: 'array',
            items: { $ref: '#/components/schemas/InternalConflict' },
          },
        },
      },
      DayOff: {
        type: 'object',
        required: [
          'id',
          'periodId',
          'name',
          'type',
          'startDate',
          'endDate',
          'notes',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'integer', example: 25 },
          periodId: { type: 'integer', example: 12 },
          name: { type: 'string', maxLength: 60, example: 'Consejo técnico' },
          type: {
            type: 'string',
            enum: ['day_off', 'vacation'],
            example: 'day_off',
          },
          startDate: { type: 'string', format: 'date', example: '2026-09-10' },
          endDate: { type: 'string', format: 'date', example: '2026-09-10' },
          notes: {
            anyOf: [
              { type: 'string', maxLength: 150, example: 'Suspensión de actividades.' },
              { type: 'null' },
            ],
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DayOffListSuccess: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/DayOff' },
          },
        },
      },
      DayOffSuccess: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          data: { $ref: '#/components/schemas/DayOff' },
        },
      },
      CreateDayOffSuccess: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Descanso creado correctamente.' },
          data: { $ref: '#/components/schemas/DayOff' },
        },
      },
      UpdateDayOffSuccess: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Descanso actualizado correctamente.' },
          data: { $ref: '#/components/schemas/DayOff' },
        },
      },
      DeleteDayOffSuccess: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', const: true },
          message: { type: 'string', const: 'Descanso eliminado correctamente.' },
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
      },      UpdatePeriodSuccess: {        type: 'object',
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
        example: {
          code: 'NO_ACCESS_TOKEN',
          message: 'Acceso denegado',
        },
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
            example: 'NO_ACCESS_TOKEN',
          },
          message: { type: 'string', example: 'Acceso denegado' },
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
};
