import { lazy, Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { PublicChatLauncher } from "../../components/PublicChatLauncher";
import OfflineBookingRecovery from "../../components/OfflineBookingRecovery";
import { BookingProvider } from "../booking/BookingProvider";
import { useBookingModal } from "../booking/BookingContext";
import { PublicPhotosProvider } from "../../hooks/usePublicPhotos";
import { AuthProvider } from "../../hooks/useAuth";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useExperiencePause } from "../../experience/useExperiencePause";

const PublicChatWidget = lazy(() => import("../../components/PublicChatWidget"));

function PracticeExperienceBridge({ chatOpen }: { chatOpen: boolean }) {
  const { isBookingOpen } = useBookingModal();
  useExperiencePause("chat", chatOpen);
  useExperiencePause("booking", isBookingOpen);
  return null;
}

function PracticeChrome() {
  const { t } = useTranslation();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const [chatOpen, setChatOpen] = useState(false);
  const showChat = location.pathname !== "/editor";

  return (
    <>
      <PracticeExperienceBridge chatOpen={chatOpen} />
      <Suspense fallback={null}>
        <OfflineBookingRecovery isOnline={isOnline} />
      </Suspense>
      <Outlet />
      {showChat && (
        <div className={`public-chat-widget${chatOpen ? " is-open" : ""}`}>
          <PublicChatLauncher open={chatOpen} onToggle={() => setChatOpen((open) => !open)} />
          {chatOpen && (
            <Suspense
              fallback={
                <div className="public-chat-panel public-chat-panel-loading" role="status" aria-live="polite">
                  {t("common.loading")}
                </div>
              }
            >
              <PublicChatWidget open onClose={() => setChatOpen(false)} />
            </Suspense>
          )}
        </div>
      )}
    </>
  );
}

export function PracticeLayout() {
  return (
    <AuthProvider>
      <BookingProvider>
        <PublicPhotosProvider>
          <PracticeChrome />
        </PublicPhotosProvider>
      </BookingProvider>
    </AuthProvider>
  );
}
