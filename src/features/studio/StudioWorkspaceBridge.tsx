import { PackagePlus } from "lucide-react";

export function StudioWorkspaceBridge({ name, assetCount, disabled, onLoad }: { name: string; assetCount: number; disabled: boolean; onLoad: () => void }) {
  return (
    <div className="studio-workspace-bridge">
      <span><strong>PROJECT DOCK</strong><small>{name} / {assetCount} ASSETS</small></span>
      <button type="button" onClick={onLoad} disabled={disabled}><PackagePlus size={16} aria-hidden="true" />LOAD ASSETS</button>
    </div>
  );
}
