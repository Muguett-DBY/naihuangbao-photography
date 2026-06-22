import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "animal-island-ui";
import { adminMutationHeaders } from "../../lib/admin-helpers";
import { CheckCircle, XCircle, Eye, Star } from "lucide-react";

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
      onShowToast("Photo featured", "success");
    } catch (error) {
      onShowToast("Failed to feature photo", "error");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="admin-moderation-loading">Loading...</div>;
  }

  return (
    <div className="admin-moderation-queue">
      <h2>{t("admin.moderation.title", "Photo Moderation Queue")}</h2>
      {pendingPhotos.length === 0 ? (
        <div className="admin-moderation-empty">
          {t("admin.moderation.empty", "No photos pending moderation")}
        </div>
      ) : (
        <div className="admin-moderation-grid">
          {pendingPhotos.map((photo) => (
            <div key={photo.id} className="admin-moderation-card">
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
