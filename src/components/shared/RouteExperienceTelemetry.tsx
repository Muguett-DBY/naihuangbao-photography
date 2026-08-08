import { useEffect } from "react";
import { finishViewTransition } from "../../lib/view-transition";
import { track } from "../../utils/track";

export function RouteExperienceTelemetry({ pathname }: { pathname: string }) {
  useEffect(() => {
    const metric = finishViewTransition(pathname);
    if (!metric) return;
    const frame = window.requestAnimationFrame(() => {
      track("route_transition", {
        from: metric.from,
        to: metric.to,
        kind: metric.kind,
        duration: metric.duration,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}
