import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap";

type ModalProps = {
  open: boolean;
  title?: ReactNode;
  width?: number | string;
  maskClosable?: boolean;
  footer?: ReactNode | null;
  onClose?: () => void;
  onOk?: () => void;
  children?: ReactNode;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
};

export function Modal({
  open,
  title,
  width = 520,
  maskClosable = true,
  footer = null,
  onClose,
  onOk,
  children,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useFocusTrap<HTMLDivElement>({ active: open, initialFocus: "first" });

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const footerContent = footer ?? (onOk ? (
    <button type="button" className="ui-modal-confirm" onClick={onOk}>
      Confirm
    </button>
  ) : null);

  return createPortal(
    <div
      className="ui-modal-backdrop"
      onMouseDown={(event) => {
        if (maskClosable && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className={["ui-modal", className].filter(Boolean).join(" ")}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (title ? titleId : undefined)}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
      >
        <div className="ui-modal-surface">
          {title ? <div id={titleId} className="ui-modal-title">{title}</div> : null}
          <div className="ui-modal-body">
            {children}
          </div>
          {footerContent ? <div className="ui-modal-footer">{footerContent}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
