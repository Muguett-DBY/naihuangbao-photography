import { isAdminRequest } from "../../_auth";
import { jsonResponse, unauthorized, unavailable } from "../../_responses";

export const onRequestGet: PagesFunction<Env & { ADMIN_PASSWORD?: string }> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();

  try {
    const db = context.env.DB;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const [
      photoTotal,
      photoPublic,
      photoFeatured,
      photoLast7,
      photoPrev7,
      bookingPending,
      bookingContacted,
      bookingDone,
      bookingTotal,
      bookingLast7,
      bookingPrev7,
      userTotal,
      userLast7,
      courseTotal,
      courseLast7,
      presetTotal,
      presetLast7,
      workshopTotal,
      workshopLast7,
      subscriberTotal,
      subscriberLast7,
      paymentLast7Succeeded,
      paymentLast7Failed,
      recentBookings,
      recentPhotos,
    ] = await Promise.all([
      db.prepare("select count(*) as c from photos").first<{ c: number }>(),
      db.prepare("select count(*) as c from photos where visibility = 'public'").first<{ c: number }>(),
      db.prepare("select count(*) as c from photos where featured = 1").first<{ c: number }>(),
      db.prepare("select count(*) as c from photos where created_at >= ?").bind(sevenDaysAgo).first<{ c: number }>(),
      db.prepare("select count(*) as c from photos where created_at >= ? and created_at < ?").bind(fourteenDaysAgo, sevenDaysAgo).first<{ c: number }>(),
      db.prepare("select count(*) as c from booking_requests where status = 'pending'").first<{ c: number }>(),
      db.prepare("select count(*) as c from booking_requests where status = 'contacted'").first<{ c: number }>(),
      db.prepare("select count(*) as c from booking_requests where status = 'done'").first<{ c: number }>(),
      db.prepare("select count(*) as c from booking_requests").first<{ c: number }>(),
      db.prepare("select count(*) as c from booking_requests where created_at >= ?").bind(sevenDaysAgo).first<{ c: number }>(),
      db.prepare("select count(*) as c from booking_requests where created_at >= ? and created_at < ?").bind(fourteenDaysAgo, sevenDaysAgo).first<{ c: number }>(),
      db.prepare("select count(*) as c from users").first<{ c: number }>(),
      db.prepare("select count(*) as c from users where created_at >= ?").bind(sevenDaysAgo).first<{ c: number }>(),
      db.prepare("select count(*) as c from courses").first<{ c: number }>(),
      db.prepare("select count(*) as c from courses where created_at >= ?").bind(sevenDaysAgo).first<{ c: number }>(),
      db.prepare("select count(*) as c from presets").first<{ c: number }>(),
      db.prepare("select count(*) as c from presets where created_at >= ?").bind(sevenDaysAgo).first<{ c: number }>(),
      db.prepare("select count(*) as c from workshops").first<{ c: number }>(),
      db.prepare("select count(*) as c from workshops where created_at >= ?").bind(sevenDaysAgo).first<{ c: number }>(),
      db.prepare("select count(*) as c from subscribers where active = 1").first<{ c: number }>(),
      db.prepare("select count(*) as c from subscribers where created_at >= ? and active = 1").bind(sevenDaysAgo).first<{ c: number }>(),
      db.prepare("select count(*) as c from payment_intents where status = 'succeeded' and updated_at >= ?").bind(sevenDaysAgo).first<{ c: number }>(),
      db.prepare("select count(*) as c from payment_intents where status = 'failed' and updated_at >= ?").bind(sevenDaysAgo).first<{ c: number }>(),
      db.prepare("select id, name, package_name, status, created_at from booking_requests order by created_at desc limit 5").all<{ id: string; name: string; package_name: string; status: string; created_at: string }>(),
      db.prepare("select id, title, style, created_at from photos order by created_at desc limit 5").all<{ id: string; title: string; style: string; created_at: string }>(),
    ]);

    const trend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const conversionRate = (() => {
      const succeeded = paymentLast7Succeeded?.c ?? 0;
      const failed = paymentLast7Failed?.c ?? 0;
      const total = succeeded + failed;
      if (total === 0) return 0;
      return Math.round((succeeded / total) * 100);
    })();

    return jsonResponse({
      photos: {
        total: photoTotal?.c ?? 0,
        public: photoPublic?.c ?? 0,
        featured: photoFeatured?.c ?? 0,
        trendPercent: trend(photoLast7?.c ?? 0, photoPrev7?.c ?? 0),
      },
      bookings: {
        pending: bookingPending?.c ?? 0,
        contacted: bookingContacted?.c ?? 0,
        done: bookingDone?.c ?? 0,
        total: bookingTotal?.c ?? 0,
        trendPercent: trend(bookingLast7?.c ?? 0, bookingPrev7?.c ?? 0),
      },
      users: {
        total: userTotal?.c ?? 0,
        trendPercent: trend(userLast7?.c ?? 0, 0),
      },
      courses: {
        total: courseTotal?.c ?? 0,
        trendPercent: trend(courseLast7?.c ?? 0, 0),
      },
      presets: {
        total: presetTotal?.c ?? 0,
        trendPercent: trend(presetLast7?.c ?? 0, 0),
      },
      workshops: {
        total: workshopTotal?.c ?? 0,
        trendPercent: trend(workshopLast7?.c ?? 0, 0),
      },
      subscribers: {
        total: subscriberTotal?.c ?? 0,
        trendPercent: trend(subscriberLast7?.c ?? 0, 0),
      },
      payments: {
        conversionRatePercent: conversionRate,
        last7Succeeded: paymentLast7Succeeded?.c ?? 0,
        last7Failed: paymentLast7Failed?.c ?? 0,
      },
      recentBookings: recentBookings?.results ?? [],
      recentPhotos: recentPhotos?.results ?? [],
    });
  } catch (error) {
    return unavailable("加载统计数据失败", error, { route: "/api/admin/stats", method: "GET" });
  }
};
