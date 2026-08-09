import { Columns3, Frame, ListTree, Moon, Move3d, Newspaper, SunMedium, Waves } from "lucide-react";
import type { WorkspaceExhibition } from "../../types/workspace-project";

const themes = [
  { id: "paper", label: "Paper", detail: "Warm editorial", icon: SunMedium },
  { id: "gallery", label: "Gallery", detail: "Quiet white room", icon: Frame },
  { id: "night", label: "Night", detail: "Dark projection", icon: Moon },
] as const;

export function ExhibitionControls({ value, onChange }: { value: WorkspaceExhibition; onChange: (next: WorkspaceExhibition) => void }) {
  const patch = (next: Partial<WorkspaceExhibition>) => onChange({ ...value, ...next });
  return (
    <div className="exhibition-controls" aria-label="Exhibition direction">
      <div className="exhibition-controls__themes">
        <span>EXHIBITION WORLD</span>
        {themes.map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" className={value.theme === id ? "is-active" : undefined} aria-pressed={value.theme === id} onClick={() => patch({ theme: id })}><Icon size={18} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span></button>)}
      </div>
      <div className="exhibition-controls__modes">
        <span>SPATIAL DIRECTION</span>
        <div><button type="button" className={value.density === "editorial" ? "is-active" : undefined} aria-pressed={value.density === "editorial"} onClick={() => patch({ density: "editorial" })}><Newspaper size={17} aria-hidden="true" />EDITORIAL</button><button type="button" className={value.density === "immersive" ? "is-active" : undefined} aria-pressed={value.density === "immersive"} onClick={() => patch({ density: "immersive" })}><Move3d size={17} aria-hidden="true" />IMMERSIVE</button></div>
        <div><button type="button" className={value.motion === "calm" ? "is-active" : undefined} aria-pressed={value.motion === "calm"} onClick={() => patch({ motion: "calm" })}><Columns3 size={17} aria-hidden="true" />CALM</button><button type="button" className={value.motion === "full" ? "is-active" : undefined} aria-pressed={value.motion === "full"} onClick={() => patch({ motion: "full" })}><Waves size={17} aria-hidden="true" />FULL MOTION</button></div>
        <label><input type="checkbox" checked={value.showIndex} onChange={(event) => patch({ showIndex: event.target.checked })} /><ListTree size={17} aria-hidden="true" /><span>SHOW FRAME INDEX</span></label>
      </div>
    </div>
  );
}
