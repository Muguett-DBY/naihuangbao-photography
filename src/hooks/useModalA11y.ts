import { useEffect, useRef } from "react";

type ModalA11yOptions = {
  open: boolean;
  titleId?: string;
  descriptionId?: string;
};

export function useModalA11y({ open, titleId, descriptionId }: ModalA11yOptions) {
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const apply = () => {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      dialogs.forEach((dialog) => {
        if (titleId && !dialog.getAttribute("aria-labelledby")) {
          dialog.setAttribute("aria-labelledby", titleId);
        }
        if (descriptionId && !dialog.getAttribute("aria-describedby")) {
          dialog.setAttribute("aria-describedby", descriptionId);
        }
        const htmlDialog = dialog as HTMLElement;
        if (htmlDialog.style.outline === "" || htmlDialog.style.outline === undefined) {
          htmlDialog.style.outline = "none";
        }
      });
    };
    apply();
    observerRef.current = new MutationObserver(apply);
    observerRef.current.observe(document.body, { childList: true, subtree: true });
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [open, titleId, descriptionId]);
}
