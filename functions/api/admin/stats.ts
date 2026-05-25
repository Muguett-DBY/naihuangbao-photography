import { isAdminRequest } from "../../_auth";
import { jsonResponse, unauthorized, unavailable } from "../../_responses";

export const onRequestGet: PagesFunction<Env & { ADMIN_PASSWORD?: string }> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();

  try {
    const [photoCount, publicCount, hiddenCount, bookingPending, bookingTotal] = await Promise.all([
      context.env.DB.prepare("select count(*) as c from photos").first<{ c: number }>(),
      context.env.DB.prepare("select count(*) as c from photos where visibility = 'public'").first<{ c: number }>(),
      context.env.DB.prepare("select count(*) as c from photos where visibility = 'hidden'").first<{ c: number }>(),
      context.env.DB.prepare("select count(*) as c from booking_requests where status = 'pending'").first<{ c: number }>(),
      context.env.DB.prepare("select count(*) as c from booking_requests").first<{ c: number }>(),
    ]);

    return jsonResponse({
      photos: { total: photoCount?.c ?? 0, public: publicCount?.c ?? 0, hidden: hiddenCount?.c ?? 0 },
      bookings: { pending: bookingPending?.c ?? 0, total: bookingTotal?.c ?? 0 },
    });
  } catch (error) {
    return unavailable("加载统计数据失败", error, { route: "/api/admin/stats", method: "GET" });
  }
};
