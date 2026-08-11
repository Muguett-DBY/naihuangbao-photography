import { Columns3, Frame, ListTree, Moon, Move3d, Newspaper, SunMedium, Waves } from "lucide-react";
import type { WorkspaceExhibition } from "../../types/workspace-project";
import { useWorkspaceCopy, type WorkspaceCopyKey } from "../../i18n/workspace-copy";

const themes: Array<{ id: WorkspaceExhibition["theme"]; label: WorkspaceCopyKey; detail: WorkspaceCopyKey; icon: typeof SunMedium }> = [
  { id: "paper", label: "themePaper", detail: "themePaperDetail", icon: SunMedium },
  { id: "gallery", label: "themeGallery", detail: "themeGalleryDetail", icon: Frame },
  { id: "night", label: "themeNight", detail: "themeNightDetail", icon: Moon },
];

export function ExhibitionControls({ value, onChange }: { value: WorkspaceExhibition; onChange: (next: WorkspaceExhibition) => void }) {
  const { text } = useWorkspaceCopy();
  const patch = (next: Partial<WorkspaceExhibition>) => onChange({ ...value, ...next });
  return (
    <div className="exhibition-controls" aria-label={text("exhibitionDirection")}>
      <div className="exhibition-controls__themes">
        <span>{text("exhibitionWorld")}</span>
        {themes.map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" data-exhibition-theme={id} className={value.theme === id ? "is-active" : undefined} aria-pressed={value.theme === id} onClick={() => patch({ theme: id })}><Icon size={18} aria-hidden="true" /><span><strong>{text(label)}</strong><small>{text(detail)}</small></span></button>)}
      </div>
      <div className="exhibition-controls__modes">
        <span>{text("spatialDirection")}</span>
        <div><button type="button" data-exhibition-density="editorial" className={value.density === "editorial" ? "is-active" : undefined} aria-pressed={value.density === "editorial"} onClick={() => patch({ density: "editorial" })}><Newspaper size={17} aria-hidden="true" />{text("editorial")}</button><button type="button" data-exhibition-density="immersive" className={value.density === "immersive" ? "is-active" : undefined} aria-pressed={value.density === "immersive"} onClick={() => patch({ density: "immersive" })}><Move3d size={17} aria-hidden="true" />{text("immersive")}</button></div>
        <div><button type="button" data-exhibition-motion="calm" className={value.motion === "calm" ? "is-active" : undefined} aria-pressed={value.motion === "calm"} onClick={() => patch({ motion: "calm" })}><Columns3 size={17} aria-hidden="true" />{text("calm")}</button><button type="button" data-exhibition-motion="full" className={value.motion === "full" ? "is-active" : undefined} aria-pressed={value.motion === "full"} onClick={() => patch({ motion: "full" })}><Waves size={17} aria-hidden="true" />{text("fullMotion")}</button></div>
        <label><input type="checkbox" checked={value.showIndex} onChange={(event) => patch({ showIndex: event.target.checked })} /><ListTree size={17} aria-hidden="true" /><span>{text("showFrameIndex")}</span></label>
      </div>
    </div>
  );
}
