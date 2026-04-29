export function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}
