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

export function validateOptionalInt(value: unknown, field: string, min = 0): ValidationResult {
  if (value === undefined || value === null || value === "") {
    return { valid: true };
  }
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(num) || num < min) {
    return { valid: false, error: `${field} 必须为不小于 ${min} 的整数` };
  }
  return { valid: true };
}

export function validateUrl(value: unknown, field: string, required = false): ValidationResult {
  if (!value || value === "") {
    if (required) return { valid: false, error: `${field} 为必填项` };
    return { valid: true };
  }
  if (typeof value !== "string") {
    return { valid: false, error: `${field} 格式不正确` };
  }
  try {
    new URL(value);
    return { valid: true };
  } catch {
    return { valid: false, error: `${field} 不是有效的 URL` };
  }
}

export function validateBoolean(value: unknown, field: string): ValidationResult {
  if (value === 0 || value === 1 || value === true || value === false) {
    return { valid: true };
  }
  if (value === "0" || value === "1") {
    return { valid: true };
  }
  return { valid: false, error: `${field} 必须为布尔值` };
}

export function validateEnum<T extends string>(
  value: unknown, field: string, allowed: readonly T[],
): ValidationResult {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    return { valid: false, error: `${field} 必须是以下值之一: ${allowed.join(", ")}` };
  }
  return { valid: true };
}

export function validateOptionalEnum<T extends string>(
  value: unknown, field: string, allowed: readonly T[],
): ValidationResult {
  if (value === undefined || value === null || value === "") {
    return { valid: true };
  }
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    return { valid: false, error: `${field} 必须是以下值之一: ${allowed.join(", ")}` };
  }
  return { valid: true };
}

export function validateId(value: unknown, field = "id"): ValidationResult {
  if (typeof value !== "string" || !value.trim()) {
    return { valid: false, error: `${field} 为必填项` };
  }
  if (value.trim().length < 8) {
    return { valid: false, error: `${field} 格式不正确` };
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
