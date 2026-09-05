import { z } from 'zod';

// Valida y normaliza los datos requeridos para registrar un usuario.
export const registerSchema = z.object({
  firstName: z
    .string({
      error: 'El nombre es obligatorio.'
    })
    .trim()
    .min(1, {
      error: 'El nombre es obligatorio.'
    }),

  lastName: z
    .string({
      error: 'El apellido es obligatorio.'
    })
    .trim()
    .min(2, {
      error:
        'El apellido debe contener al menos 2 caracteres.'
    }),

  email: z
    .string({
      error: 'El correo electrónico es obligatorio.'
    })
    .trim()
    .min(1, {
      error: 'El correo electrónico es obligatorio.'
    })
    .regex(
      /\S+@\S+\.\S+/,
      {
        error: 'El correo electrónico es inválido.'
      }
    )
    .transform((value) => {
      return value.toLowerCase();
    }),

  password: z
    .string({
      error: 'La contraseña es obligatoria.'
    })
    .refine(
      (value) => {
        return value.trim().length > 0;
      },
      {
        error: 'La contraseña es obligatoria.'
      }
    )
    .min(6, {
      error:
        'La contraseña debe contener al menos 6 caracteres.'
    })
});

// Valida las credenciales requeridas para iniciar sesión.
export const loginSchema = z.object({
  email: z
    .string({
      error: 'Todos los campos son obligatorios'
    })
    .trim()
    .min(1, {
      error: 'Todos los campos son obligatorios'
    })
    .transform((value) => {
      return value.toLowerCase();
    }),

  password: z
    .string({
      error: 'Todos los campos son obligatorios'
    })
    .min(1, {
      error: 'Todos los campos son obligatorios'
    })
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
