import { useCallback, useEffect, useRef, type FocusEvent, type HTMLAttributes } from "react";
import { useExperienceStore } from "./ExperienceProvider";

type ImmersiveHighlightProps = Pick<
  HTMLAttributes<HTMLElement>,
  "onPointerEnter" | "onPointerLeave" | "onFocusCapture" | "onBlurCapture"
> & {
  "data-immersive-item-id": string;
};

export function useImmersiveHighlight() {
  const store = useExperienceStore();
  const interactionsRef = useRef<{ hovered: string | null; focused: string | null }>({
    hovered: null,
    focused: null,
  });
  const publish = useCallback(() => {
    const { hovered, focused } = interactionsRef.current;
    store.setHighlightedId(hovered ?? focused);
  }, [store]);
  const reset = useCallback(() => {
    interactionsRef.current.hovered = null;
    interactionsRef.current.focused = null;
    store.setHighlightedId(null);
  }, [store]);

  useEffect(() => reset, [reset]);

  return useCallback((id: string): ImmersiveHighlightProps => ({
    "data-immersive-item-id": id,
    onPointerEnter: () => {
      interactionsRef.current.hovered = id;
      publish();
    },
    onPointerLeave: () => {
      if (interactionsRef.current.hovered === id) interactionsRef.current.hovered = null;
      publish();
    },
    onFocusCapture: () => {
      interactionsRef.current.focused = id;
      publish();
    },
    onBlurCapture: (event: FocusEvent<HTMLElement>) => {
      if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
      if (interactionsRef.current.focused === id) interactionsRef.current.focused = null;
      publish();
    },
  }), [publish]);
}
