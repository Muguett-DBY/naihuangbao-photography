import { getUserFromRequest } from "./_auth";
import { jsonResponse, unauthorized } from "./_responses";
import { getRequiredAuthSecret } from "./_security";

export type ProjectSyncEnv = Env & { AUTH_SECRET?: string };

export type ProjectSyncAuth =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export async function requireProjectSyncUser(request: Request, env: ProjectSyncEnv): Promise<ProjectSyncAuth> {
  const secret = getRequiredAuthSecret(env);
  if (!secret) return { ok: false, response: jsonResponse({ error: "Project sync is not configured" }, 503) };
  const user = await getUserFromRequest(request, secret, env.DB);
  if (!user) return { ok: false, response: unauthorized("Sign in to sync visual projects") };
  return { ok: true, userId: user.userId };
}
