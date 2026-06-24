import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "animal-island-ui";
import { Download, CalendarDays, Image } from "lucide-react";
import { adminMutationHeaders } from "../../lib/admin-helpers";

export function AdminReportsTab() {
  const { t } = useTranslation();
  const [exportingBookings, setExportingBookings] = useState(false);
  const [exportingPhotos, setExportingPhotos] = useState(false);

  const exportCSV = useCallback(async (endpoint: string, filename: string, setLoading: (v: boolean) => void) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        credentials: "include",
        headers: adminMutationHeaders,
      });
      const data = await response.json();
      const items = data.bookings || data.photos || [];
      if (!items.length) return;

      const headers = Object.keys(items[0]);
      const csv = [
        headers.join(","),
        ...items.map((row: Record<string, unknown>) =>
          headers.map((h) => {
            const val = String(row[h] ?? "");
            return `"${val.replace(/"/g, '""')}"`;
          }).join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    }
    setLoading(false);
  }, []);

  return (
    <div className="adm-content-panel">
      <h2>{t("admin.reports.title", "Reports")}</h2>
      <p className="adm-reports-desc">{t("admin.reports.description", "Download data reports for offline analysis.")}</p>
      <div className="adm-reports-grid">
        <div className="adm-report-card">
          <CalendarDays size={24} />
          <h3>{t("admin.reports.bookings", "Bookings Report")}</h3>
          <p>{t("admin.reports.bookingsDesc", "All bookings with status, client info, and dates.")}</p>
          <Button
            type="primary"
            size="small"
            onClick={() => exportCSV("/api/admin/bookings", "bookings-report", setExportingBookings)}
            disabled={exportingBookings}
          >
            <Download size={14} /> {exportingBookings ? t("admin.reports.exporting", "Exporting...") : t("admin.reports.downloadCSV", "Download CSV")}
          </Button>
        </div>
        <div className="adm-report-card">
          <Image size={24} />
          <h3>{t("admin.reports.photos", "Photos Report")}</h3>
          <p>{t("admin.reports.photosDesc", "All photos with metadata, visibility, and style info.")}</p>
          <Button
            type="primary"
            size="small"
            onClick={() => exportCSV("/api/admin/photos", "photos-report", setExportingPhotos)}
            disabled={exportingPhotos}
          >
            <Download size={14} /> {exportingPhotos ? t("admin.reports.exporting", "Exporting...") : t("admin.reports.downloadCSV", "Download CSV")}
          </Button>
        </div>
      </div>
    </div>
  );
}
