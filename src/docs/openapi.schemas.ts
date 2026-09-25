import { z } from 'zod';
import { loginSchema, registerSchema } from '../modules/auth/auth.schemas.js';
import { periodSchema } from '../modules/periods/periods.schemas.js';
import { createDayOffSchema } from '../modules/days-off/days-off.schemas.js';
import {
  createClassesSchema,
  createSubjectSchema,
  externalConflictsSchema,
  internalConflictsSchema,
  updateSubjectSchema,
} from '../modules/subjects/subjects.schemas.js';

const options = {
  io: 'input',
  unrepresentable: 'any',
} as const;

export const registerJsonSchema = z.toJSONSchema(registerSchema, options);
export const loginJsonSchema = z.toJSONSchema(loginSchema, options);
export const periodJsonSchema = z.toJSONSchema(periodSchema, options);
export const dayOffJsonSchema = z.toJSONSchema(createDayOffSchema, options);
export const createSubjectJsonSchema = z.toJSONSchema(createSubjectSchema, options);
export const updateSubjectJsonSchema = z.toJSONSchema(updateSubjectSchema, options);
export const createClassesJsonSchema = z.toJSONSchema(createClassesSchema, options);
export const externalConflictsJsonSchema = z.toJSONSchema(externalConflictsSchema, options);
export const internalConflictsJsonSchema = z.toJSONSchema(internalConflictsSchema, options);
