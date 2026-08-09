import "../styles/asset-vault-v8.css";
import { Boxes, FileImage, FolderInput, HardDrive, Plus, Search, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { useSEO } from "../hooks/useSEO";
import { deleteVaultAsset, importVaultFile, listVaultAssets, toWorkspaceVaultAsset, vaultAssetSrc } from "../lib/vault-store";
import type { VaultAsset } from "../types/vault-asset";

type SmartFilter = "all" | "bright" | "dark" | "muted" | "warm" | "green" | "quality";

const smartFilters: Array<{ id: SmartFilter; label: string }> = [
  { id: "all", label: "All originals" },
  { id: "quality", label: "Strong selects" },
  { id: "bright", label: "Bright light" },
  { id: "dark", label: "Dark studies" },
  { id: "muted", label: "Muted color" },
  { id: "warm", label: "Warm material" },
  { id: "green", label: "Botanical green" },
];

function matchesFilter(asset: VaultAsset, filter: SmartFilter) {
  if (filter === "all") return true;
  if (filter === "quality") return asset.analysis.qualityScore >= 58;
  return asset.tags.includes(filter);
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AssetVaultPage() {
  useSEO({ title: "Asset Vault", descKey: "platform.routes.vault", path: "/vault" });
  const workspace = useWorkspaceProjects();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SmartFilter>("all");
  const [notice, setNotice] = useState("Drop a folder or choose image files to begin.");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    void listVaultAssets().then(setAssets);
  }, []);

  const importFiles = async (files: File[]) => {
    if (!workspace.ready) return;
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (!images.length) {
      setNotice("No supported image files were found.");
      return;
    }
    let current = [...assets];
    const projectAssets = [];
    let imported = 0;
    let duplicates = 0;
    setProgress({ done: 0, total: images.length });
    for (let index = 0; index < images.length; index += 1) {
      try {
        const result = await importVaultFile(images[index], current);
        if (result.duplicateOf) {
          duplicates += 1;
        } else {
          imported += 1;
          current = [result.asset, ...current];
          projectAssets.push(toWorkspaceVaultAsset(result.asset));
        }
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "An original could not be imported.");
      }
      setProgress({ done: index + 1, total: images.length });
    }
    setAssets(current);
    workspace.linkVaultAssets(projectAssets);
    setProgress(null);
    setNotice(`${imported} originals indexed${duplicates ? ` / ${duplicates} near-duplicates skipped` : ""}.`);
    workspace.checkpoint(`Indexed ${imported} originals in Asset Vault`, "vault");
  };

  const visibleAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assets.filter((asset) => matchesFilter(asset, filter) && (!normalized || `${asset.name} ${asset.tags.join(" ")}`.toLowerCase().includes(normalized)));
  }, [assets, filter, query]);

  const totalBytes = assets.reduce((sum, asset) => sum + asset.size, 0);
  const opfsCount = assets.filter((asset) => asset.storage === "opfs").length;

  return (
    <main className="asset-vault" data-vault-ready={workspace.ready}>
      <header className="asset-vault__hero">
        <div><span>NHB / ASSET VAULT / V8</span><h1>Originals become<br />working memory.</h1></div>
        <div><p>Import folders without uploading them. Every frame is indexed locally by light, color, contrast, quality, and perceptual identity.</p><small><ShieldCheck size={15} aria-hidden="true" />LOCAL-FIRST / NOTHING LEAVES THIS BROWSER</small></div>
      </header>

      <section
        className={`asset-vault__intake ${dragging ? "is-dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); if (workspace.ready) void importFiles([...event.dataTransfer.files]); }}
      >
        <FolderInput size={32} aria-hidden="true" />
        <div><span>DROP A FOLDER OR IMAGE SET</span><h2>{progress ? `Analyzing ${progress.done} / ${progress.total}` : "Build a private visual index."}</h2><p>{notice}</p></div>
        <div className="asset-vault__intake-actions">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={Boolean(progress) || !workspace.ready}><Plus size={17} aria-hidden="true" />SELECT FILES</button>
          <button type="button" onClick={() => folderInputRef.current?.click()} disabled={Boolean(progress) || !workspace.ready}><FolderInput size={17} aria-hidden="true" />SELECT FOLDER</button>
          <input ref={fileInputRef} hidden type="file" accept="image/*" multiple disabled={!workspace.ready} onChange={(event) => { void importFiles([...(event.target.files ?? [])]); event.target.value = ""; }} />
          <input ref={folderInputRef} hidden type="file" accept="image/*" multiple disabled={!workspace.ready} onChange={(event) => { void importFiles([...(event.target.files ?? [])]); event.target.value = ""; }} />
        </div>
        {progress ? <div className="asset-vault__progress" aria-label={`Imported ${progress.done} of ${progress.total}`}><span style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div> : null}
      </section>

      <section className="asset-vault__workspace" aria-labelledby="asset-vault-index-title">
        <aside className="asset-vault__rail">
          <header><Boxes size={18} aria-hidden="true" /><span>SMART SHELVES</span></header>
          <nav aria-label="Smart asset filters">{smartFilters.map((entry) => <button type="button" key={entry.id} className={filter === entry.id ? "is-active" : undefined} onClick={() => setFilter(entry.id)}>{entry.label}<small>{assets.filter((asset) => matchesFilter(asset, entry.id)).length}</small></button>)}</nav>
          <div className="asset-vault__storage"><HardDrive size={18} aria-hidden="true" /><span>LOCAL STORAGE<strong>{formatBytes(totalBytes)}</strong><small>{opfsCount} OPFS / {assets.length - opfsCount} IDB</small></span></div>
          <div className="asset-vault__cloud"><UploadCloud size={18} aria-hidden="true" /><span>OPTIONAL CLOUD<small>Available after sign-in in V8 Sync.</small></span></div>
        </aside>

        <div className="asset-vault__index">
          <header>
            <div><span>01 / PRIVATE INDEX</span><h2 id="asset-vault-index-title">{visibleAssets.length} indexed originals</h2></div>
            <label><Search size={17} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, color, light..." /></label>
          </header>
          {visibleAssets.length ? <div className="asset-vault__grid">{visibleAssets.map((asset, index) => (
            <article key={asset.id} data-vault-asset={asset.id}>
              <figure><ImageWithFallback src={vaultAssetSrc(asset.id)} alt={asset.name} title={asset.name} sizes="(max-width: 700px) 50vw, 24vw" tone={index % 3 === 0 ? "sage" : "cream"} /><span>{asset.analysis.qualityScore}</span></figure>
              <header><div><small>{asset.width}×{asset.height} / {formatBytes(asset.size)}</small><h3>{asset.name}</h3></div><button type="button" title={`Delete ${asset.name}`} onClick={() => void deleteVaultAsset(asset).then(() => { setAssets((current) => current.filter((entry) => entry.id !== asset.id)); workspace.removeAsset(asset.id); })}><Trash2 size={15} aria-hidden="true" /></button></header>
              <div className="asset-vault__signals"><span style={{ backgroundColor: asset.analysis.dominantColor }} title={asset.analysis.dominantColor} /><small>LIGHT {Math.round(asset.analysis.luminance * 100)}</small><small>CONTRAST {Math.round(asset.analysis.contrast * 100)}</small></div>
              <footer>{asset.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</footer>
            </article>
          ))}</div> : <div className="asset-vault__empty"><FileImage size={30} aria-hidden="true" /><h3>No originals on this shelf.</h3><p>Change the filter or import a new image set.</p></div>}
        </div>
      </section>
    </main>
  );
}
