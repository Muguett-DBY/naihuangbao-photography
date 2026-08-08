import { Eye } from "lucide-react";
import type { KeyboardEvent } from "react";

export function EditorHoldOriginalButton({
  active,
  label,
  onChange,
}: {
  active: boolean;
  label: string;
  onChange: (active: boolean) => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") onChange(true);
  };

  return (
    <button
      type="button"
      className={`editor-icon-btn editor-hold-original ${active ? "active" : ""}`}
      onPointerDown={() => onChange(true)}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onPointerLeave={() => onChange(false)}
      onBlur={() => onChange(false)}
      onKeyDown={handleKeyDown}
      onKeyUp={() => onChange(false)}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      <Eye size={17} aria-hidden="true" />
    </button>
  );
}
