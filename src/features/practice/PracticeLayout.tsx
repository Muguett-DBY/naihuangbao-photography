import { lazy, Suspense, useState } from "react";
import { Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { PublicChatLauncher } from "../../components/PublicChatLauncher";
import { AuthProvider } from "../../hooks/useAuth";
import { useExperiencePause } from "../../experience/useExperiencePause";

const PublicChatWidget = lazy(() => import("../../components/PublicChatWidget"));

function PracticeExperienceBridge({ chatOpen }: { chatOpen: boolean }) {
  useExperiencePause("chat", chatOpen);
  return null;
}

function PracticeChrome() {
  const { t } = useTranslation();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <PracticeExperienceBridge chatOpen={chatOpen} />
      <Outlet />
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
    </>
  );
}

export function PracticeLayout() {
  return (
    <AuthProvider>
      <PracticeChrome />
    </AuthProvider>
  );
}
