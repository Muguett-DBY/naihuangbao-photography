import { useEffect, useState } from "react";

export function useVaultAssetUrl(src: string) {
  const isVaultAsset = src.startsWith("vault://");
  const [resolvedSrc, setResolvedSrc] = useState(isVaultAsset ? "" : src);

  useEffect(() => {
    if (!src.startsWith("vault://")) {
      setResolvedSrc(src);
      return undefined;
    }
    let cancelled = false;
    let objectUrl = "";
    const id = src.slice("vault://".length);
    void import("../lib/vault-store").then(async ({ getVaultAsset, readVaultBlob }) => {
      const asset = await getVaultAsset(id);
      const localBlob = asset ? await readVaultBlob(asset) : null;
      const blob = localBlob ?? await fetch(`/api/projects/sync/assets/${encodeURIComponent(id)}`, { credentials: "include" })
        .then((response) => response.ok ? response.blob() : null)
        .catch(() => null);
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setResolvedSrc(objectUrl);
    }).catch(() => {
      if (!cancelled) setResolvedSrc("");
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return { resolvedSrc, resolving: isVaultAsset && !resolvedSrc };
}
