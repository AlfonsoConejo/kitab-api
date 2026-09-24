// Convierte una URL a su origen estándar, sin ruta ni barra final.
export function normalizeOrigin(origin: string): string | null {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

// Lee y normaliza la lista de orígenes permitidos desde ALLOWED_ORIGINS.
export function getAllowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((origin): origin is string => origin !== null);
}
