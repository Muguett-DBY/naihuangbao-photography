import "../styles/workspace-v7.css";
import { FolderOpen, Images, Layers3, Plus, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { PrefetchLink } from "./shared/PrefetchLink";

const primaryPrefixes = ["/archive", "/stories", "/create", "/studio", "/projects", "/about"];

export function ProjectDock() {
  const { pathname } = useLocation();
  const workspace = useWorkspaceProjects();
  const [open, setOpen] = useState(false);
  const visible = primaryPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!visible || !workspace.ready || !workspace.activeProject) return null;
  const project = workspace.activeProject;

  return (
    <aside className={`project-dock${open ? " is-open" : ""}`} aria-label="Current visual project">
      <button className="project-dock__trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="project-dock-panel">
        <span className="project-dock__pulse" aria-hidden="true" />
        <span><small>ACTIVE PROJECT</small><strong>{project.name}</strong></span>
        <span className="project-dock__count"><Images size={14} aria-hidden="true" />{project.assets.length}</span>
      </button>

      {open ? (
        <div className="project-dock__panel" id="project-dock-panel">
          <header>
            <div><small>NHB / PROJECT DOCK</small><h2>{project.name}</h2></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close project dock"><X size={18} aria-hidden="true" /></button>
          </header>

          <label>
            <span>WORKSPACE</span>
            <select value={project.id} onChange={(event) => workspace.setActiveProjectId(event.target.value)}>
              {workspace.projects.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </label>

          <div className="project-dock__assets">
            {project.assets.length ? project.assets.slice(-8).map((asset) => (
              <button type="button" key={asset.assetId} onClick={() => workspace.removeAsset(asset.assetId)} title={`Remove ${asset.title}`}>
                <img src={asset.src} alt="" width="72" height="72" loading="lazy" />
              </button>
            )) : <p>Collect frames from the Archive to begin.</p>}
          </div>

          <div className="project-dock__actions">
            <PrefetchLink to="/projects" onClick={() => setOpen(false)}><FolderOpen size={16} aria-hidden="true" />Open project</PrefetchLink>
            <PrefetchLink to="/create" onClick={() => setOpen(false)}><Layers3 size={16} aria-hidden="true" />Compose</PrefetchLink>
            <button type="button" onClick={() => workspace.createProject(`Visual study ${workspace.projects.length + 1}`)}><Plus size={16} aria-hidden="true" />New</button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
