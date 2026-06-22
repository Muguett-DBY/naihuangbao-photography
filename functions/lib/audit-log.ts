import { enforceRateLimit } from "../_security";

export type AuditLogEntry = {
  action: string;
  entity_type: string;
  entity_id?: string;
  admin_user?: string;
  diff_json?: string;
};

/**
 * Log an audit entry to the admin_audit_log table.
 * Non-blocking: if logging fails, the mutation still succeeds.
 */
export async function logAuditEvent(
  context: { env: Env; request: Request },
  entry: AuditLogEntry,
): Promise<void> {
  try {
    const adminUser =
      context.request.headers.get("cf-access-authenticated-user-email") ?? "admin";

    await context.env.DB.prepare(
      "INSERT INTO admin_audit_log (action, entity_type, entity_id, admin_user, diff_json, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
    )
      .bind(
        entry.action.slice(0, 50),
        entry.entity_type.slice(0, 50),
        (entry.entity_id ?? "").slice(0, 100),
        (entry.admin_user ?? adminUser).slice(0, 100),
        (entry.diff_json ?? "{}").slice(0, 5000),
      )
      .run();
  } catch {
    // Audit logging is best-effort; don't fail the mutation
  }
}

/**
 * Build a JSON diff string from two objects (old vs new).
 */
export function buildDiffJson(oldData: Record<string, unknown>, newData: Record<string, unknown>): string {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  for (const key of allKeys) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      diff[key] = { from: oldData[key], to: newData[key] };
    }
  }
  return JSON.stringify(diff);
}

/**
 * Get admin user identifier from request.
 */
export function getAdminUser(request: Request): string {
  return request.headers.get("cf-access-authenticated-user-email") ?? "admin";
}
