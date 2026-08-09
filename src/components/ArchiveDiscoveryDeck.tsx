import { Bookmark, Check, Copy, FolderPlus, Palette, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { archiveProjects } from "../data/living-archive";
import { visualAssetById, visualAssets } from "../data/visual-assets";
import { useArchiveCollection } from "../hooks/useArchiveCollection";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import {
  createArchiveExhibitionQuery,
  parseArchiveAssetIds,
  rankSimilarAssets,
  type ArchiveDiscoveryMode,
} from "../lib/archive-discovery";
import { ImageWithFallback } from "./ImageWithFallback";
import { PrefetchLink } from "./shared/PrefetchLink";

const modeLabels: Record<ArchiveDiscoveryMode, string> = {
  hybrid: "综合邻近",
  color: "颜色邻近",
  material: "材质邻近",
};

const validAssetIds = new Set(visualAssets.map((asset) => asset.id));
const defaultAsset = visualAssets.find((asset) => asset.src.includes("visual-os-v6")) ?? visualAssets[0];
const projectById = new Map(archiveProjects.map((project) => [project.id, project]));

export function ArchiveDiscoveryDeck() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<ArchiveDiscoveryMode>("hybrid");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const collection = useArchiveCollection();
  const workspace = useWorkspaceProjects();
  const requestedAsset = visualAssetById.get(searchParams.get("similar") ?? "");
  const reference = requestedAsset ?? defaultAsset;
  const ranked = useMemo(
    () => reference ? rankSimilarAssets(reference, visualAssets, mode, 6) : [],
    [mode, reference],
  );
  const deepLinkedIds = parseArchiveAssetIds(searchParams.get("exhibition"), validAssetIds);
  const exhibitionIds = deepLinkedIds.length ? deepLinkedIds : collection.assetIds;
  const exhibitionAssets = exhibitionIds.map((id) => visualAssetById.get(id)).filter(Boolean);

  if (!reference) return null;

  const selectReference = (assetId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("similar", assetId);
    setSearchParams(next, { replace: true });
  };

  const shareExhibition = async () => {
    if (!exhibitionIds.length) return;
    const url = `${window.location.origin}/archive?${createArchiveExhibitionQuery(exhibitionIds)}#archive-exhibition`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  };

  const referenceProject = projectById.get(reference.projectIds[0]);

  return (
    <section className="archive-discovery" id="archive-discovery" aria-labelledby="archive-discovery-title">
      <header className="platform-section-head">
        <div>
          <span className="platform-index">02 / VISUAL NEIGHBORHOOD</span>
          <h2 id="archive-discovery-title">画面邻近实验室</h2>
        </div>
        <p>选择一张画面，沿颜色、材质和画幅关系继续发现。计算完全在本地完成。</p>
      </header>

      <div className="archive-discovery__modes" role="group" aria-label="相似画面计算方式">
        {Object.entries(modeLabels).map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={mode === value ? "is-active" : undefined}
            aria-pressed={mode === value}
            onClick={() => setMode(value as ArchiveDiscoveryMode)}
          >
            {value === "color" ? <Palette size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
            {label}
          </button>
        ))}
      </div>

      <div className="archive-discovery__workspace">
        <article className="archive-discovery__reference" data-reference-asset={reference.id}>
          <ImageWithFallback src={reference.src} alt={reference.alt} title={reference.alt} priority sizes="(max-width: 780px) 100vw, 46vw" tone="cream" />
          <div>
            <span>REFERENCE / {reference.orientation.toUpperCase()}</span>
            <h3>{referenceProject?.title ?? reference.alt}</h3>
            <p>{reference.note ?? reference.alt}</p>
            <div className="archive-discovery__tags">
              {[...reference.palette, ...reference.descriptors].slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <div className="archive-discovery__actions">
              <button type="button" className={collection.has(reference.id) ? "is-saved" : undefined} onClick={() => collection.toggle(reference.id)}>
                {collection.has(reference.id) ? <Check size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
                {collection.has(reference.id) ? "已加入展览" : "加入展览"}
              </button>
              <button type="button" className={workspace.hasAsset(reference.id) ? "is-saved" : undefined} onClick={() => workspace.toggleAsset(reference, referenceProject?.title)}>
                {workspace.hasAsset(reference.id) ? <Check size={16} aria-hidden="true" /> : <FolderPlus size={16} aria-hidden="true" />}
                {workspace.hasAsset(reference.id) ? "已在项目" : "加入项目"}
              </button>
              {referenceProject ? <PrefetchLink to={`/archive/${referenceProject.id}`}>打开项目</PrefetchLink> : null}
            </div>
          </div>
        </article>

        <div className="archive-discovery__neighbors" aria-live="polite">
          {ranked.map(({ asset, score, colorSimilarity, materialSimilarity }, index) => {
            const project = projectById.get(asset.projectIds[0]);
            return (
              <article key={asset.id}>
                <button type="button" className="archive-discovery__neighbor-image" onClick={() => selectReference(asset.id)} aria-label={`以这张画面继续发现：${asset.alt}`}>
                  <ImageWithFallback src={asset.src} alt={asset.alt} title={asset.alt} sizes="(max-width: 780px) 46vw, 18vw" tone={index % 2 ? "sage" : "cream"} />
                  <span>{String(index + 1).padStart(2, "0")} · {Math.round(score * 100)}%</span>
                </button>
                <div>
                  <strong>{project?.title ?? asset.alt}</strong>
                  <small>色 {Math.round(colorSimilarity * 100)} · 材 {Math.round(materialSimilarity * 100)}</small>
                  <button type="button" className={collection.has(asset.id) ? "is-saved" : undefined} onClick={() => collection.toggle(asset.id)} title="加入展览" aria-label={`加入展览：${asset.alt}`}>
                    {collection.has(asset.id) ? <Check size={15} aria-hidden="true" /> : <Bookmark size={15} aria-hidden="true" />}
                  </button>
                  <button type="button" className={workspace.hasAsset(asset.id) ? "is-saved" : undefined} onClick={() => workspace.toggleAsset(asset, project?.title)} title="加入项目" aria-label={`加入项目：${asset.alt}`}>
                    {workspace.hasAsset(asset.id) ? <Check size={15} aria-hidden="true" /> : <FolderPlus size={15} aria-hidden="true" />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="archive-exhibition" id="archive-exhibition">
        <header>
          <div><span className="platform-index">LOCAL EXHIBITION</span><h3>我的临时展览 · {exhibitionAssets.length}</h3></div>
          <div>
            <button type="button" disabled={!exhibitionAssets.length} onClick={shareExhibition}><Copy size={15} aria-hidden="true" />{copyState === "copied" ? "链接已复制" : copyState === "failed" ? "复制失败" : "分享展览"}</button>
            <button type="button" disabled={!collection.count} onClick={collection.clear} title="清空本地展览" aria-label="清空本地展览"><Trash2 size={16} aria-hidden="true" /></button>
          </div>
        </header>
        {exhibitionAssets.length ? (
          <div className="archive-exhibition__strip">
            {exhibitionAssets.map((asset) => (
              <button type="button" key={asset!.id} onClick={() => selectReference(asset!.id)}>
                <ImageWithFallback src={asset!.src} alt={asset!.alt} title={asset!.alt} sizes="160px" tone="ink" />
              </button>
            ))}
          </div>
        ) : <p>从上方画面中挑选素材，建立一条只保存在当前浏览器里的视觉线索。</p>}
      </div>
    </section>
  );
}
