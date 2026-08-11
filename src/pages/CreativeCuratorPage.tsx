import "../styles/creative-curator-v8.css";
import { ArrowRight, BrainCircuit, Check, Layers3, RefreshCw, Sparkles } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PageTransition } from "../components/shared/PageTransition";
import { visualAssets } from "../data/visual-assets";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { useSEO } from "../hooks/useSEO";
import { useWorkspaceCopy, type WorkspaceCopyKey } from "../i18n/workspace-copy";
import { CURATOR_PRESETS, curateVisualSequence, type CuratedRole, type CuratorPreset } from "../lib/creative-intelligence";

const frameCounts = [6, 12, 24] as const;
const presetLabels: Record<CuratorPreset, WorkspaceCopyKey> = {
  morning: "presetMorning",
  botanical: "presetBotanical",
  coral: "presetCoral",
  nocturne: "presetNocturne",
};
const roleLabels: Record<CuratedRole, WorkspaceCopyKey> = {
  opening: "opening",
  breath: "roleBreath",
  detail: "roleDetail",
  turn: "roleTurn",
  closing: "closing",
};

export function CreativeCuratorPage() {
  const { text } = useWorkspaceCopy();
  useSEO({ title: text("curatorTitle"), descKey: "platform.routes.curate", path: "/curate" });
  const workspace = useWorkspaceProjects();
  const navigate = useNavigate();
  const [query, setQuery] = useState(text("curatorPrompt"));
  const [preset, setPreset] = useState<CuratorPreset>("morning");
  const [count, setCount] = useState<(typeof frameCounts)[number]>(12);
  const [sequence, setSequence] = useState(() => curateVisualSequence(query, visualAssets, count, preset));
  const [notice, setNotice] = useState("");

  const regenerate = () => {
    setSequence(curateVisualSequence(query, visualAssets, count, preset));
    setNotice("");
  };

  const addToProject = () => {
    workspace.addAssets(sequence.frames.map(({ asset }) => asset));
    workspace.checkpoint(text("curatedCheckpoint", { count: sequence.frames.length }), "archive");
    setNotice(text("addedFrames", { count: sequence.frames.length, project: workspace.activeProject?.name ?? text("activeProjectFallback") }));
  };

  const openComposer = () => {
    addToProject();
    navigate("/compose");
  };

  return (
    <PageTransition className="curator-page">
      <header className="curator-hero">
        <div>
          <span>NHB / CREATIVE INTELLIGENCE / V8</span>
          <h1>{text("curatorTitle")}</h1>
        </div>
        <p>{text("curatorIntro")}</p>
      </header>

      <section className="curator-console" aria-labelledby="curator-console-title">
        <header><BrainCircuit size={24} aria-hidden="true" /><div><span>01 / {text("direction")}</span><h2 id="curator-console-title">{text("creativeBrief")}</h2></div></header>
        <label className="curator-prompt">
          <span>{text("moodMaterialRhythm")}</span>
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={3} />
        </label>
        <div className="curator-options">
          <fieldset><legend>{text("colorWorld")}</legend><div>{(Object.keys(CURATOR_PRESETS) as CuratorPreset[]).map((id) => <button key={id} type="button" className={preset === id ? "is-active" : undefined} aria-pressed={preset === id} onClick={() => setPreset(id)}><span className={`curator-swatch curator-swatch--${id}`} aria-hidden="true" />{text(presetLabels[id])}</button>)}</div></fieldset>
          <fieldset><legend>{text("sequenceLength")}</legend><div>{frameCounts.map((value) => <button key={value} type="button" data-frame-count={value} className={count === value ? "is-active" : undefined} aria-pressed={count === value} onClick={() => setCount(value)}>{text("frameCount", { count: value })}</button>)}</div></fieldset>
          <button className="curator-generate" data-action="curate" type="button" onClick={regenerate}><RefreshCw size={18} aria-hidden="true" />{text("curateAgain")}</button>
        </div>
      </section>

      <section className="curator-result" aria-labelledby="curator-result-title">
        <aside className="curator-brief">
          <span>02 / {text("sequenceLogic")}</span>
          <h2 id="curator-result-title">{text("curatorResult")}</h2>
          <div className="curator-palette" aria-label={text("curatedPalette")}>{sequence.palette.map((color) => <span key={color} style={{ "--curator-color": color } as CSSProperties} title={color} />)}</div>
          <ol>
            <li><strong>{text("opening")}</strong><p>{sequence.outline.opening}</p></li>
            <li><strong>{text("development")}</strong><p>{sequence.outline.development}</p></li>
            <li><strong>{text("closing")}</strong><p>{sequence.outline.closing}</p></li>
          </ol>
          <div className="curator-actions">
            <button type="button" data-action="add-to-project" onClick={addToProject}><Check size={17} aria-hidden="true" />{text("addToProject")}</button>
            <button type="button" data-action="open-composer" onClick={openComposer}><Layers3 size={17} aria-hidden="true" />{text("openComposer")}</button>
          </div>
          {notice ? <p className="curator-notice" role="status">{notice}</p> : null}
        </aside>

        <div className="curator-sequence">
          {sequence.frames.map(({ asset, reason, role, score }, index) => (
            <figure key={asset.id} style={{ "--curator-order": index } as CSSProperties}>
              <div><ImageWithFallback src={asset.src} alt={asset.alt} title={asset.alt} sizes="(max-width: 760px) 100vw, 30vw" tone={index % 4 === 3 ? "ink" : index % 3 === 1 ? "sage" : "cream"} /></div>
              <figcaption><span>{String(index + 1).padStart(2, "0")} / {text(roleLabels[role])}</span><strong>{asset.alt}</strong><p>{reason}</p><small>{text("signalScore", { score })}</small></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="curator-footer"><Sparkles size={18} aria-hidden="true" /><span>{text("localSignals")}</span><button type="button" onClick={openComposer}>{text("directEdit")} <ArrowRight size={16} aria-hidden="true" /></button></footer>
    </PageTransition>
  );
}
