import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "animal-island-ui";
import { adminMutationHeaders } from "../../lib/admin-helpers";
import { CheckCircle, XCircle, Eye, Star, Square, CheckSquare } from "lucide-react";

type PhotoItem = {
  id: string;
  title: string;
  style: string;
  location: string;
  imageUrl: string;
  alt: string;
  featured: boolean;
  visibility: string;
  album?: string;
  createdAt?: string;
};

type PhotoModerationQueueProps = {
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
};

export function AdminPhotoModerationQueue({ onShowToast }: PhotoModerationQueueProps) {
  const { t } = useTranslation();
  const [pendingPhotos, setPendingPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

  useEffect(() => {
    fetchPendingPhotos();
  }, []);

  const fetchPendingPhotos = async () => {
    try {
      const response = await fetch("/api/admin/photos?visibility=hidden", {
        credentials: "include",
        headers: adminMutationHeaders,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch pending photos");
      }
      const data = await response.json();
      setPendingPhotos(data.photos || []);
    } catch (error) {
      onShowToast("Failed to load pending photos", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === pendingPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingPhotos.map((p) => p.id)));
    }
  }, [pendingPhotos, selectedIds.size]);

  const handleApprove = async (photoId: string) => {
    setProcessingId(photoId);
    try {
      const response = await fetch(`/api/admin/photos/${photoId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...adminMutationHeaders,
        },
        body: JSON.stringify({ visibility: "public" }),
      });
      if (!response.ok) {
        throw new Error("Failed to approve photo");
      }
      setPendingPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(photoId); return next; });
      onShowToast("Photo approved", "success");
    } catch (error) {
      onShowToast("Failed to approve photo", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (photoId: string) => {
    setProcessingId(photoId);
    try {
      const response = await fetch(`/api/admin/photos/${photoId}`, {
        method: "DELETE",
        credentials: "include",
        headers: adminMutationHeaders,
      });
      if (!response.ok) {
        throw new Error("Failed to reject photo");
      }
      setPendingPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(photoId); return next; });
      onShowToast("Photo rejected", "success");
    } catch (error) {
      onShowToast("Failed to reject photo", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleFeature = async (photoId: string) => {
    setProcessingId(photoId);
    try {
      const response = await fetch(`/api/admin/photos/${photoId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...adminMutationHeaders,
        },
        body: JSON.stringify({ visibility: "public", featured: true }),
      });
      if (!response.ok) {
        throw new Error("Failed to feature photo");
      }
      setPendingPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(photoId); return next; });
      onShowToast("Photo featured", "success");
    } catch (error) {
      onShowToast("Failed to feature photo", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchApprove = async () => {
    const idsToApprove = selectedIds.size > 0
      ? Array.from(selectedIds)
      : pendingPhotos.map((photo) => photo.id);
    if (idsToApprove.length === 0) return;
    setBatchProcessing(true);
    try {
      const response = await fetch("/api/admin/photos/batch", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...adminMutationHeaders,
        },
        body: JSON.stringify({
          ids: idsToApprove,
          action: "visibility",
          value: "public",
        }),
      });
      if (!response.ok) throw new Error("Batch approve failed");
      const approvedIds = new Set(idsToApprove);
      setPendingPhotos((prev) => prev.filter((p) => !approvedIds.has(p.id)));
      onShowToast(`${idsToApprove.length} photos approved`, "success");
      setSelectedIds(new Set());
    } catch (error) {
      onShowToast("Batch approve failed", "error");
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const responses = await Promise.all(ids.map((id) =>
        fetch(`/api/admin/photos/${id}`, {
          method: "DELETE",
          credentials: "include",
          headers: adminMutationHeaders,
        })
      ));
      const failedReject = responses.find((response) => !response.ok);
      if (failedReject) throw new Error("Batch reject failed");
      const rejectedIds = new Set(ids);
      setPendingPhotos((prev) => prev.filter((p) => !rejectedIds.has(p.id)));
      onShowToast(`${ids.length} photos rejected`, "success");
      setSelectedIds(new Set());
    } catch (error) {
      onShowToast("Batch reject failed", "error");
    } finally {
      setBatchProcessing(false);
    }
  };

  if (loading) {
    return <div className="admin-moderation-loading">Loading...</div>;
  }

  return (
    <div className="admin-moderation-queue">
      <div className="admin-moderation-header">
        <h2>{t("admin.moderation.title", "Photo Moderation Queue")}</h2>
        <span className="admin-moderation-count">{pendingPhotos.length} pending</span>
      </div>

      {pendingPhotos.length > 0 && (
        <div className="admin-moderation-toolbar">
          <button type="button" className="admin-moderation-select-all" onClick={selectAll}>
            {selectedIds.size === pendingPhotos.length ? (
              <CheckSquare size={16} />
            ) : (
              <Square size={16} />
            )}
            {selectedIds.size === pendingPhotos.length ? t("admin.moderation.deselectAll", "Deselect all") : t("admin.moderation.selectAll", "Select all")}
          </button>
          {selectedIds.size > 0 && (
            <div className="admin-moderation-batch-actions">
              <span className="admin-moderation-selected-count">{selectedIds.size} selected</span>
              <Button type="primary" size="small" onClick={handleBatchApprove} disabled={batchProcessing}>
                <CheckCircle size={14} /> {t("admin.moderation.batchApprove", "Batch approve")}
              </Button>
              <Button type="default" size="small" danger onClick={handleBatchReject} disabled={batchProcessing}>
                <XCircle size={14} /> {t("admin.moderation.batchReject", "Batch reject")}
              </Button>
            </div>
          )}
          {selectedIds.size === 0 && pendingPhotos.length > 0 && (
            <div className="admin-moderation-quick-actions">
              <Button type="text" size="small" onClick={handleBatchApprove} disabled={batchProcessing}>
                <CheckCircle size={14} /> {t("admin.moderation.approveAll", "Approve all")}
              </Button>
            </div>
          )}
        </div>
      )}

      {pendingPhotos.length === 0 ? (
        <div className="admin-moderation-empty">
          {t("admin.moderation.empty", "No photos pending moderation")}
        </div>
      ) : (
        <div className="admin-moderation-grid">
          {pendingPhotos.map((photo) => (
            <div key={photo.id} className={`admin-moderation-card ${selectedIds.has(photo.id) ? "selected" : ""}`}>
              <div className="admin-moderation-select" onClick={() => toggleSelect(photo.id)}>
                {selectedIds.has(photo.id) ? (
                  <CheckSquare size={18} className="admin-moderation-checkbox checked" />
                ) : (
                  <Square size={18} className="admin-moderation-checkbox" />
                )}
              </div>
              <div className="admin-moderation-image">
                <img src={photo.imageUrl} alt={photo.alt} />
              </div>
              <div className="admin-moderation-info">
                <h3>{photo.title}</h3>
                <p>{photo.style} · {photo.location}</p>
                {photo.album && <p>{t("admin.moderation.album", "Album")}: {photo.album}</p>}
              </div>
              <div className="admin-moderation-actions">
                <Button
                  type="primary"
                  size="small"
                  onClick={() => handleApprove(photo.id)}
                  disabled={processingId === photo.id}
                >
                  <CheckCircle size={14} /> {t("admin.moderation.approve", "Approve")}
                </Button>
                <Button
                  type="default"
                  size="small"
                  onClick={() => handleFeature(photo.id)}
                  disabled={processingId === photo.id}
                >
                  <Star size={14} /> {t("admin.moderation.feature", "Feature")}
                </Button>
                <Button
                  type="default"
                  size="small"
                  danger
                  onClick={() => handleReject(photo.id)}
                  disabled={processingId === photo.id}
                >
                  <XCircle size={14} /> {t("admin.moderation.reject", "Reject")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
