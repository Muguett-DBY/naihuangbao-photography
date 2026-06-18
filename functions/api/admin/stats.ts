import { isAdminRequest } from "../../_auth";
import { jsonResponse, unauthorized, unavailable } from "../../_responses";

export const onRequestGet: PagesFunction<Env & { ADMIN_PASSWORD?: string }> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();

  try {
    const db = context.env.DB;
    const [
      photoTotal,
      photoPublic,
      photoFeatured,
      bookingPending,
      bookingContacted,
      bookingDone,
      bookingTotal,
      userTotal,
      courseTotal,
      presetTotal,
      workshopTotal,
      subscriberTotal,
      recentBookings,
      recentPhotos,
    ] = await Promise.all([
      db.prepare("select count(*) as c from photos").first<{ c: number }>(),
      db.prepare("select count(*) as c from photos where visibility = 'public'").first<{ c: number }>(),
      db.prepare("select count(*) as c from photos where featured = 1").first<{ c: number }>(),
      db.prepare("select count(*) as c from booking_requests where status = 'pending'").first<{ c: number }>(),
      db.prepare("select count(*) as c from booking_requests where status = 'contacted'").first<{ c: number }>(),
      db.prepare("select count(*) as c from booking_requests where status = 'done'").first<{ c: number }>(),
      db.prepare("select count(*) as c from booking_requests").first<{ c: number }>(),
      db.prepare("select count(*) as c from users").first<{ c: number }>(),
      db.prepare("select count(*) as c from courses").first<{ c: number }>(),
      db.prepare("select count(*) as c from presets").first<{ c: number }>(),
      db.prepare("select count(*) as c from workshops").first<{ c: number }>(),
      db.prepare("select count(*) as c from subscribers").first<{ c: number }>(),
      db.prepare("select id, name, package_name, status, created_at from booking_requests order by created_at desc limit 5").all<{ id: string; name: string; package_name: string; status: string; created_at: string }>(),
      db.prepare("select id, title, style, created_at from photos order by created_at desc limit 5").all<{ id: string; title: string; style: string; created_at: string }>(),
    ]);

    return jsonResponse({
      photos: {
        total: photoTotal?.c ?? 0,
        public: photoPublic?.c ?? 0,
        featured: photoFeatured?.c ?? 0,
      },
      bookings: {
        pending: bookingPending?.c ?? 0,
        contacted: bookingContacted?.c ?? 0,
        done: bookingDone?.c ?? 0,
        total: bookingTotal?.c ?? 0,
      },
      users: { total: userTotal?.c ?? 0 },
      courses: { total: courseTotal?.c ?? 0 },
      presets: { total: presetTotal?.c ?? 0 },
      workshops: { total: workshopTotal?.c ?? 0 },
      subscribers: { total: subscriberTotal?.c ?? 0 },
      recentBookings: recentBookings?.results ?? [],
      recentPhotos: recentPhotos?.results ?? [],
    });
  } catch (error) {
    return unavailable("加载统计数据失败", error, { route: "/api/admin/stats", method: "GET" });
  }
};
