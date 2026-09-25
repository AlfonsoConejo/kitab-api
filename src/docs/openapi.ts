import { authPaths } from './auth.openapi.js';
import { daysOffPaths } from './days-off.openapi.js';
import { openApiComponents } from './openapi.components.js';
import { periodPaths } from './periods.openapi.js';
import { subjectPaths } from './subjects.openapi.js';

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
    {
      name: 'Days Off',
      description: 'Días libres y períodos vacacionales dentro de períodos académicos.',
    },
  ],

  paths: {
    ...authPaths,
    ...periodPaths,
    ...subjectPaths,
    ...daysOffPaths,
  },

  components: openApiComponents,
};
