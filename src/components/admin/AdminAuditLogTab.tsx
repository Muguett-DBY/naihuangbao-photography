import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "animal-island-ui";
import { adminMutationHeaders } from "../../lib/admin-helpers";

type AuditLogEntry = {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  admin_user: string;
  diff: Record<string, unknown>;
  created_at: string;
};

type AuditLogProps = {
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
};

export function AdminAuditLogTab({ onShowToast }: AuditLogProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchAuditLogs();
  }, [entityTypeFilter, actionFilter, page]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      if (entityTypeFilter) params.append("entity_type", entityTypeFilter);
      if (actionFilter) params.append("action", actionFilter);

      const response = await fetch(`/api/admin/audit-log?${params.toString()}`, {
        credentials: "include",
        headers: adminMutationHeaders,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (error) {
      onShowToast("Failed to load audit logs", "error");
      console.error("Audit log fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatJson = (obj: Record<string, unknown>) => {
    if (!obj || Object.keys(obj).length === 0) return "—";
    return JSON.stringify(obj, null, 2);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="admin-audit-log">
      <div className="audit-log-header">
        <h2>{t("admin.auditLog.title", "Audit Log")}</h2>
        <div className="audit-log-filters">
          <select
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">{t("admin.auditLog.allEntities", "All Entities")}</option>
            <option value="photo">{t("admin.auditLog.photos", "Photos")}</option>
            <option value="preset">{t("admin.auditLog.presets", "Presets")}</option>
            <option value="course">{t("admin.auditLog.courses", "Courses")}</option>
            <option value="booking">{t("admin.auditLog.bookings", "Bookings")}</option>
          </select>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">{t("admin.auditLog.allActions", "All Actions")}</option>
            <option value="create">{t("admin.auditLog.create", "Create")}</option>
            <option value="update">{t("admin.auditLog.update", "Update")}</option>
            <option value="delete">{t("admin.auditLog.delete", "Delete")}</option>
            <option value="batch">{t("admin.auditLog.batch", "Batch")}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="audit-log-loading">{t("common.loading", "Loading...")}</div>
      ) : entries.length === 0 ? (
        <div className="audit-log-empty">
          {t("admin.auditLog.empty", "No audit log entries found")}
        </div>
      ) : (
        <>
          <div className="audit-log-table-container">
            <table className="audit-log-table">
              <thead>
                <tr>
                  <th>{t("admin.auditLog.timestamp", "Timestamp")}</th>
                  <th>{t("admin.auditLog.action", "Action")}</th>
                  <th>{t("admin.auditLog.entityType", "Entity")}</th>
                  <th>{t("admin.auditLog.entityId", "ID")}</th>
                  <th>{t("admin.auditLog.user", "User")}</th>
                  <th>{t("admin.auditLog.changes", "Changes")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.created_at)}</td>
                    <td>
                      <span className={`audit-badge audit-badge-${entry.action}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td>{entry.entity_type}</td>
                    <td className="entity-id">{entry.entity_id}</td>
                    <td>{entry.admin_user}</td>
                    <td>
                      <pre className="audit-diff">{formatJson(entry.diff)}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="audit-log-pagination">
            <Button
              type="default"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              {t("common.previous", "Previous")}
            </Button>
            <span>{page + 1}</span>
            <Button
              type="default"
              onClick={() => setPage((p) => p + 1)}
              disabled={entries.length < limit}
            >
              {t("common.next", "Next")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
