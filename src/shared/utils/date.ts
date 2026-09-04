// Convierte una fecha de base de datos al formato YYYY-MM-DD usado por la API.
export const toDateOnly = (value: string | Date) => new Date(value).toISOString().slice(0, 10);
