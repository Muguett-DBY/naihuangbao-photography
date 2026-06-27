import { isAdminRequest } from "../../../_auth";
import { jsonResponse, unauthorized, unavailable } from "../../../_responses";

type ReportType = "bookings" | "photos" | "payments";

type ReportRequest = {
  type?: string;
  fromDate?: string;
  toDate?: string;
};

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidDate(value: string | undefined): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

function buildHtmlReport(title: string, generatedAt: string, sections: { heading: string; rows: string[][] }[]): string {
  const sectionHtml = sections
    .map(
      (section) => `
    <section class="report-section">
      <h2>${escapeHtml(section.heading)}</h2>
      <table>
        <tbody>
          ${section.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </section>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #2d2725; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .meta { color: #8f7d77; font-size: 13px; margin-bottom: 24px; }
    .report-section { margin-bottom: 32px; page-break-inside: avoid; }
    h2 { font-size: 16px; margin-bottom: 12px; color: #5d4e49; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 8px 12px; border-bottom: 1px solid rgba(93,78,73,0.12); }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Generated ${escapeHtml(generatedAt)}</p>
  ${sectionHtml}
</body>
</html>`;
}

export const onRequestPost: PagesFunction<Env & { ADMIN_PASSWORD?: string }> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();

  const body = (await context.request.json().catch(() => ({}))) as ReportRequest;
  const type = body.type as ReportType;
  if (!["bookings", "photos", "payments"].includes(type)) {
    return jsonResponse({ error: "Invalid report type" }, 400);
  }

  const fromDate = isValidDate(body.fromDate) ? new Date(body.fromDate!).toISOString() : null;
  const toDate = isValidDate(body.toDate) ? new Date(body.toDate!).toISOString() : null;

  if (!context.env.DB) {
    return unavailable("Report service unavailable", undefined, { route: "/api/admin/reports/html", method: "POST" });
  }

  try {
    const generatedAt = new Date().toISOString();
    let title = "Report";
    let sections: { heading: string; rows: string[][] }[] = [];

    if (type === "bookings") {
      title = "Bookings Report";
      const where = [fromDate ? "created_at >= ?" : "", toDate ? "created_at <= ?" : ""].filter(Boolean).join(" AND ");
      const params: unknown[] = [];
      if (fromDate) params.push(fromDate);
      if (toDate) params.push(toDate);
      const query = `select id, name, contact, package_name, preferred_date, status, created_at from booking_requests${where ? ` WHERE ${where}` : ""} order by created_at desc limit 200`;
      const result = await context.env.DB.prepare(query).bind(...params).all<{
        id: string; name: string; contact: string; package_name: string; preferred_date: string; status: string; created_at: string;
      }>();
      sections = [{
        heading: `Bookings (${result.results.length})`,
        rows: [
          ["Name", "Contact", "Package", "Preferred Date", "Status", "Created"],
          ...result.results.map((r) => [r.name, r.contact, r.package_name, r.preferred_date, r.status, r.created_at]),
        ],
      }];
    } else if (type === "photos") {
      title = "Photos Report";
      const where = [fromDate ? "created_at >= ?" : "", toDate ? "created_at <= ?" : ""].filter(Boolean).join(" AND ");
      const params: unknown[] = [];
      if (fromDate) params.push(fromDate);
      if (toDate) params.push(toDate);
      const query = `select id, title, style, location, visibility, featured, created_at from photos${where ? ` WHERE ${where}` : ""} order by created_at desc limit 200`;
      const result = await context.env.DB.prepare(query).bind(...params).all<{
        id: string; title: string; style: string; location: string; visibility: string; featured: number; created_at: string;
      }>();
      sections = [{
        heading: `Photos (${result.results.length})`,
        rows: [
          ["Title", "Style", "Location", "Visibility", "Featured", "Created"],
          ...result.results.map((r) => [r.title, r.style, r.location, r.visibility, r.featured ? "Yes" : "No", r.created_at]),
        ],
      }];
    } else if (type === "payments") {
      title = "Payments Report";
      const where = [fromDate ? "updated_at >= ?" : "", toDate ? "updated_at <= ?" : ""].filter(Boolean).join(" AND ");
      const params: unknown[] = [];
      if (fromDate) params.push(fromDate);
      if (toDate) params.push(toDate);
      const query = `select id, purpose, reference_id, amount_cents, currency, status, provider, created_at, updated_at from payment_intents${where ? ` WHERE ${where}` : ""} order by updated_at desc limit 200`;
      const result = await context.env.DB.prepare(query).bind(...params).all<{
        id: string; purpose: string; reference_id: string; amount_cents: number; currency: string; status: string; provider: string; created_at: string; updated_at: string;
      }>();
      sections = [{
        heading: `Payments (${result.results.length})`,
        rows: [
          ["ID", "Purpose", "Reference", "Amount", "Currency", "Status", "Provider", "Updated"],
          ...result.results.map((r) => [r.id, r.purpose, r.reference_id, (r.amount_cents / 100).toFixed(2), r.currency, r.status, r.provider, r.updated_at]),
        ],
      }];
    }

    const html = buildHtmlReport(title, generatedAt, sections);

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": `attachment; filename="${type}-report-${new Date().toISOString().slice(0, 10)}.html"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return unavailable("Failed to generate report", error, { route: "/api/admin/reports/html", method: "POST" });
  }
};
