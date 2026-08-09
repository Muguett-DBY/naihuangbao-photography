import "../styles/creative-curator-v8.css";
import { ArrowRight, BrainCircuit, Check, Layers3, RefreshCw, Sparkles } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PageTransition } from "../components/shared/PageTransition";
import { visualAssets } from "../data/visual-assets";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { useSEO } from "../hooks/useSEO";
import { CURATOR_PRESETS, curateVisualSequence, type CuratorPreset } from "../lib/creative-intelligence";

const frameCounts = [6, 12, 24] as const;

export function CreativeCuratorPage() {
  useSEO({ title: "Creative Curator", descKey: "platform.routes.curate", path: "/curate" });
  const workspace = useWorkspaceProjects();
  const navigate = useNavigate();
  const [query, setQuery] = useState("奶油晨光、半透明玻璃、植物标本与安静但有张力的节奏");
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
    workspace.checkpoint(`Curated ${sequence.frames.length} frame sequence`, "archive");
    setNotice(`${sequence.frames.length} frames added to ${workspace.activeProject?.name ?? "the active project"}.`);
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
          <h1>Describe a feeling.<br />Direct a sequence.</h1>
        </div>
        <p>A deterministic local curator reads light, color, material, composition, and similarity signals. Every choice stays explainable, editable, and private.</p>
      </header>

      <section className="curator-console" aria-labelledby="curator-console-title">
        <header><BrainCircuit size={24} aria-hidden="true" /><div><span>01 / DIRECTION</span><h2 id="curator-console-title">Creative brief</h2></div></header>
        <label className="curator-prompt">
          <span>MOOD / MATERIAL / RHYTHM</span>
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={3} />
        </label>
        <div className="curator-options">
          <fieldset><legend>COLOR WORLD</legend><div>{(Object.entries(CURATOR_PRESETS) as Array<[CuratorPreset, (typeof CURATOR_PRESETS)[CuratorPreset]]>).map(([id, signal]) => <button key={id} type="button" className={preset === id ? "is-active" : undefined} aria-pressed={preset === id} onClick={() => setPreset(id)}><span className={`curator-swatch curator-swatch--${id}`} aria-hidden="true" />{signal.label}</button>)}</div></fieldset>
          <fieldset><legend>SEQUENCE LENGTH</legend><div>{frameCounts.map((value) => <button key={value} type="button" className={count === value ? "is-active" : undefined} aria-pressed={count === value} onClick={() => setCount(value)}>{value} FRAMES</button>)}</div></fieldset>
          <button className="curator-generate" type="button" onClick={regenerate}><RefreshCw size={18} aria-hidden="true" />CURATE AGAIN</button>
        </div>
      </section>

      <section className="curator-result" aria-labelledby="curator-result-title">
        <aside className="curator-brief">
          <span>02 / SEQUENCE LOGIC</span>
          <h2 id="curator-result-title">A visual edit with reasons.</h2>
          <div className="curator-palette" aria-label="Curated color palette">{sequence.palette.map((color) => <span key={color} style={{ "--curator-color": color } as CSSProperties} title={color} />)}</div>
          <ol>
            <li><strong>Opening</strong><p>{sequence.outline.opening}</p></li>
            <li><strong>Development</strong><p>{sequence.outline.development}</p></li>
            <li><strong>Closing</strong><p>{sequence.outline.closing}</p></li>
          </ol>
          <div className="curator-actions">
            <button type="button" onClick={addToProject}><Check size={17} aria-hidden="true" />ADD TO PROJECT</button>
            <button type="button" onClick={openComposer}><Layers3 size={17} aria-hidden="true" />OPEN IN COMPOSER</button>
          </div>
          {notice ? <p className="curator-notice" role="status">{notice}</p> : null}
        </aside>

        <div className="curator-sequence">
          {sequence.frames.map(({ asset, reason, role, score }, index) => (
            <figure key={asset.id} style={{ "--curator-order": index } as CSSProperties}>
              <div><ImageWithFallback src={asset.src} alt={asset.alt} title={asset.alt} sizes="(max-width: 760px) 100vw, 30vw" tone={index % 4 === 3 ? "ink" : index % 3 === 1 ? "sage" : "cream"} /></div>
              <figcaption><span>{String(index + 1).padStart(2, "0")} / {role}</span><strong>{asset.alt}</strong><p>{reason}</p><small>{score} SIGNAL SCORE</small></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="curator-footer"><Sparkles size={18} aria-hidden="true" /><span>LOCAL SIGNALS / NO MODEL CALLS / NO UPLOADS</span><button type="button" onClick={openComposer}>DIRECT THIS EDIT <ArrowRight size={16} aria-hidden="true" /></button></footer>
    </PageTransition>
  );
}
