import { jsonResponse, unauthorized, unavailable } from "../../_responses";
import { getUserFromRequest } from "../../_auth";

type AuthEnv = Env & { AUTH_SECRET?: string };

type WorkshopRow = {
  id: string;
  workshop_id: string;
  title: string;
  event_date: string;
  location: string;
  participants: number;
  status: string;
  created_at: string;
};

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const secret = context.env.AUTH_SECRET || "default-auth-secret";
  const user = await getUserFromRequest(context.request, secret);
  if (!user) return unauthorized("请先登录");

  if (!context.env.DB) {
    return jsonResponse({ workshops: [] }, 503);
  }

  try {
    const result = await context.env.DB.prepare(
      `select wr.id, wr.workshop_id, w.title, w.event_date, w.location,
              wr.participants, wr.status, wr.created_at
       from workshop_registrations wr
       join workshops w on w.id = wr.workshop_id
       where wr.contact = ?
       order by wr.created_at desc`,
    )
      .bind(user.userId)
      .all<WorkshopRow>();

    return jsonResponse({ workshops: result.results });
  } catch {
    return jsonResponse({ workshops: [] });
  }
};
