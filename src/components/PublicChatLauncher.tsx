import { Bot, X } from "lucide-react";

export function PublicChatLauncher({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="public-chat-launcher"
      type="button"
      aria-expanded={open}
      aria-controls="public-chat-panel"
      onClick={onToggle}
    >
      {open ? <X size={22} /> : <Bot size={22} />}
      <span>AI问答</span>
    </button>
  );
}
