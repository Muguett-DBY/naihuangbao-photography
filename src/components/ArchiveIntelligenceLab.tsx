import { Check, FolderPlus, ImageUp, Search, Sparkles, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { visualAssets } from "../data/visual-assets";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { constellationPosition, rankAssetsBySignal, searchVisualAssets, type ArchiveSignal } from "../lib/archive-intelligence";
import { ImageWithFallback } from "./ImageWithFallback";

const filters = [
  { id: "all", label: "全部" },
  { id: "bright", label: "明亮" },
  { id: "dark", label: "夜间" },
  { id: "玻璃", label: "玻璃" },
  { id: "纸", label: "纸张" },
  { id: "苔藓", label: "苔藓" },
  { id: "水", label: "水与雨" },
] as const;

async function analyzeReference(file: File): Promise<ArchiveSignal> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas analysis unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
  }
  const count = pixels.length / 4;
  const colorVector = [red, green, blue].map((channel) => Math.round(channel / count)) as [number, number, number];
  return { colorVector, luminance: (colorVector[0] * 0.2126 + colorVector[1] * 0.7152 + colorVector[2] * 0.0722) / 255 };
}

export function ArchiveIntelligenceLab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [signal, setSignal] = useState<ArchiveSignal | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const workspace = useWorkspaceProjects();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const candidates = useMemo(() => visualAssets.filter((asset) => {
    if (filter === "all") return true;
    if (filter === "bright") return asset.analysis.luminance >= 0.62;
    if (filter === "dark") return asset.analysis.luminance <= 0.4;
    return asset.analysis.searchText.includes(filter);
  }), [filter]);

  const results = useMemo(
    () => signal ? rankAssetsBySignal(signal, candidates, 12) : searchVisualAssets(deferredQuery, candidates, 12),
    [candidates, deferredQuery, signal],
  );
  const constellation = results.slice(0, 10);

  const submitSearch = () => {
    const next = new URLSearchParams(searchParams);
    if (query.trim()) next.set("q", query.trim()); else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const loadReference = async (file: File | undefined) => {
    if (!file) return;
    try {
      const nextPreview = URL.createObjectURL(file);
      setPreview((current) => { if (current) URL.revokeObjectURL(current); return nextPreview; });
      setSignal(await analyzeReference(file));
      setStatus("参考图只在当前浏览器中分析，没有上传。已按颜色与亮度重新排序。");
    } catch {
      setStatus("无法读取这张参考图，请尝试 JPEG、PNG、WebP 或 AVIF。");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectAsset = (assetId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("similar", assetId);
    setSearchParams(next, { replace: true });
    document.getElementById("archive-discovery")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="archive-intelligence" aria-labelledby="archive-intelligence-title">
      <header className="platform-section-head">
        <div><span className="platform-index">01 / INTELLIGENT ARCHIVE</span><h2 id="archive-intelligence-title">用语言、颜色或一张参考图寻找画面</h2></div>
        <p>70 张画面的分析在构建时完成。搜索、相似度和参考图取色都只在本地运行。</p>
      </header>

      <div className="archive-intelligence__controls">
        <form onSubmit={(event) => { event.preventDefault(); submitSearch(); }}>
          <Search size={19} aria-hidden="true" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setSignal(null); }} placeholder="例如：雨后的玻璃、柔黄纸张、深莓夜间空间" aria-label="Search the visual archive" />
          {query || signal ? <button type="button" onClick={() => { setQuery(""); setSignal(null); setPreview(null); }} aria-label="Clear archive search"><X size={17} aria-hidden="true" /></button> : null}
        </form>
        <button type="button" className="archive-intelligence__upload" onClick={() => fileInputRef.current?.click()}><ImageUp size={18} aria-hidden="true" />以图找画面</button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(event) => void loadReference(event.target.files?.[0])} />
      </div>

      <div className="archive-intelligence__filters" role="group" aria-label="Archive material filters">
        {filters.map((entry) => <button type="button" key={entry.id} aria-pressed={filter === entry.id} className={filter === entry.id ? "is-active" : undefined} onClick={() => setFilter(entry.id)}>{entry.label}</button>)}
      </div>
      {status ? <p className="archive-intelligence__status" role="status">{status}</p> : null}

      <div className="archive-intelligence__map" aria-label="Visual semantic constellation">
        <div className="archive-intelligence__map-label"><Sparkles size={15} aria-hidden="true" /><span>SEMANTIC FIELD</span><strong>{results.length} NEIGHBORS</strong></div>
        {preview ? <img className="archive-intelligence__reference-preview" src={preview} alt="Local visual reference preview" /> : null}
        {constellation.map(({ asset, score }, index) => {
          const position = constellationPosition(asset, index);
          return (
            <button
              type="button"
              key={asset.id}
              className="archive-intelligence__node"
              style={{ "--node-x": position.x, "--node-y": position.y, "--node-scale": 0.72 + score * 0.38 } as React.CSSProperties}
              onClick={() => selectAsset(asset.id)}
              aria-label={`Explore ${asset.alt}`}
            >
              <img src={asset.responsive.width640} alt="" width="88" height="88" loading="lazy" />
              <span>{Math.round(score * 100)}</span>
            </button>
          );
        })}
      </div>

      <div className="archive-intelligence__results" aria-live="polite">
        {results.map(({ asset, score, reason }, index) => (
          <article key={asset.id}>
            <button type="button" className="archive-intelligence__image" onClick={() => selectAsset(asset.id)}>
              <ImageWithFallback src={asset.src} alt={asset.alt} title={asset.alt} sizes="(max-width: 720px) 50vw, 23vw" tone={index % 3 === 0 ? "sage" : "cream"} />
            </button>
            <div><span>{reason}</span><strong>{asset.note ?? asset.alt}</strong><small>{Math.round(score * 100)}% / {asset.analysis.composition.join(" · ")}</small></div>
            <button type="button" className={workspace.hasAsset(asset.id) ? "is-saved" : undefined} onClick={() => workspace.toggleAsset(asset)} aria-label={`${workspace.hasAsset(asset.id) ? "Remove from" : "Add to"} project: ${asset.alt}`}>
              {workspace.hasAsset(asset.id) ? <Check size={16} aria-hidden="true" /> : <FolderPlus size={16} aria-hidden="true" />}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
