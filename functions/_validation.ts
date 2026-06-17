/**
 * Lightweight input validation utilities for API endpoints.
 * No external dependencies — pure TypeScript validation.
 */

export type ValidationResult = { valid: true } | { valid: false; error: string };

export function validateString(value: unknown, field: string, maxLength = 200): ValidationResult {
  if (typeof value !== "string" || !value.trim()) {
    return { valid: false, error: `${field} 为必填项` };
  }
  if (value.trim().length > maxLength) {
    return { valid: false, error: `${field} 不能超过 ${maxLength} 个字符` };
  }
  return { valid: true };
}

export function validateOptionalString(value: unknown, field: string, maxLength = 500): ValidationResult {
  if (value === undefined || value === null || value === "") {
    return { valid: true };
  }
  if (typeof value !== "string") {
    return { valid: false, error: `${field} 格式不正确` };
  }
  if (value.trim().length > maxLength) {
    return { valid: false, error: `${field} 不能超过 ${maxLength} 个字符` };
  }
  return { valid: true };
}

export function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validatePhone(value: string): boolean {
  return /^[\d\s\-+()]{7,20}$/.test(value);
}

export function validateDate(value: string): boolean {
  if (!value) return true; // optional
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function validatePositiveInt(value: unknown, field: string): ValidationResult {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(num) || num < 1) {
    return { valid: false, error: `${field} 必须为正整数` };
  }
  return { valid: true };
}

export function validateBody<T extends Record<string, unknown>>(
  body: T,
  rules: Record<string, (val: unknown) => ValidationResult>,
): { valid: true; data: T } | { valid: false; error: string } {
  for (const [field, rule] of Object.entries(rules)) {
    const result = rule(body[field]);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true, data: body };
}
