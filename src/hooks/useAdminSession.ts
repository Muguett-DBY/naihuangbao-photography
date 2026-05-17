import { useEffect, useState } from "react";

export function useAdminSession() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/session", { credentials: "include", signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setAuthenticated(!!data.authenticated))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setAuthenticated(false);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setChecking(false);
        }
      });

    return () => controller.abort();
  }, []);

  return { authenticated, checking, setAuthenticated };
}
