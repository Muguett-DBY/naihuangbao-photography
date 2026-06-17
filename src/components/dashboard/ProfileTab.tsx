import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "animal-island-ui";
import { publicMutationHeaders } from "../../lib/admin-helpers";
import { logError } from "../../lib/error-logger";

export function ProfileTab({ user }: { user: { displayName: string; email: string } }) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        credentials: "include",
        body: JSON.stringify({ displayName }),
      });
      if (response.ok) {
        setProfileMessage({ type: "success", text: t("dashboard.profileSaved") });
      } else {
        const data = await response.json();
        setProfileMessage({ type: "error", text: data.error || t("dashboard.profileError") });
      }
    } catch (e) {
      logError("DashboardProfile", e);
      setProfileMessage({ type: "error", text: t("dashboard.profileError") });
    } finally {
      setProfileLoading(false);
    }
  }, [displayName, t]);

  const handleChangePassword = useCallback(async () => {
    setPasswordLoading(true);
    setPasswordMessage(null);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...publicMutationHeaders },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (response.ok) {
        setPasswordMessage({ type: "success", text: t("dashboard.passwordChanged") });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        const data = await response.json();
        setPasswordMessage({ type: "error", text: data.error || t("dashboard.passwordError") });
      }
    } catch (e) {
      logError("DashboardPassword", e);
      setPasswordMessage({ type: "error", text: t("dashboard.passwordError") });
    } finally {
      setPasswordLoading(false);
    }
  }, [currentPassword, newPassword, t]);

  return (
    <div className="dashboard-profile-content">
      <div>
        <h3 className="dashboard-profile-section-title">{t("dashboard.editProfile")}</h3>
        <div className="dashboard-form-group">
          <label htmlFor="dashboard-display-name" className="dashboard-form-label">
            {t("dashboard.displayName")}
          </label>
          <input
            id="dashboard-display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="dashboard-form-input"
          />
          {profileMessage && (
            <p className={`dashboard-form-message dashboard-form-message--${profileMessage.type}`}>
              {profileMessage.text}
            </p>
          )}
          <Button
            type="primary"
            onClick={handleSaveProfile}
            disabled={profileLoading || !displayName.trim()}
            style={{ alignSelf: "flex-start" }}
          >
            {profileLoading ? t("common.loading") : t("dashboard.saveProfile")}
          </Button>
        </div>
      </div>

      <div className="dashboard-section-divider">
        <h3 className="dashboard-profile-section-title">{t("dashboard.changePassword")}</h3>
        <div className="dashboard-form-group">
          <label htmlFor="dashboard-current-password" className="dashboard-form-label">
            {t("dashboard.currentPassword")}
          </label>
          <input
            id="dashboard-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="dashboard-form-input"
          />
          <label htmlFor="dashboard-new-password" className="dashboard-form-label">
            {t("dashboard.newPassword")}
          </label>
          <input
            id="dashboard-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="dashboard-form-input"
          />
          {passwordMessage && (
            <p className={`dashboard-form-message dashboard-form-message--${passwordMessage.type}`}>
              {passwordMessage.text}
            </p>
          )}
          <Button
            type="primary"
            onClick={handleChangePassword}
            disabled={passwordLoading || !currentPassword || !newPassword}
            style={{ alignSelf: "flex-start" }}
          >
            {passwordLoading ? t("common.loading") : t("dashboard.updatePassword")}
          </Button>
        </div>
      </div>
    </div>
  );
}
