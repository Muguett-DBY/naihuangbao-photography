import { Database, Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { getLocalProjectStorageStatus, type LocalProjectStorageStatus } from "../../lib/local-project-files";

function formatBytes(bytes: number) {
  if (!bytes) return "0 MB";
  return `${Math.max(0.1, bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function StudioStorageStatus() {
  const [status, setStatus] = useState<LocalProjectStorageStatus | null>(null);
  useEffect(() => { void getLocalProjectStorageStatus().then(setStatus); }, []);
  return (
    <div className="studio-storage-status" aria-live="polite">
      <span><Database size={14} aria-hidden="true" />{status?.backend === "opfs" ? "OPFS PROJECT FILES" : "INDEXEDDB PROJECTS"}</span>
      <span><Gauge size={14} aria-hidden="true" />{status ? `${formatBytes(status.usage)} / ${formatBytes(status.quota)}` : "MEASURING"}</span>
      <small>{status?.persisted ? "PERSISTENT" : "BROWSER MANAGED"}</small>
    </div>
  );
}
