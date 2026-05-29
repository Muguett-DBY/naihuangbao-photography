import { Bot, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PublicChatLauncher({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      className="public-chat-launcher"
      type="button"
      aria-expanded={open}
      aria-controls="public-chat-panel"
      aria-label={open ? t("chat.close", "关闭聊天") : t("chat.open", "打开AI聊天")}
      onClick={onToggle}
    >
      {open ? <X size={22} /> : <Bot size={22} />}
      <span>{t("chat.launcherLabel")}</span>
    </button>
  );
}
