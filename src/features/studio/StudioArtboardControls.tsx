import { RectangleHorizontal, RectangleVertical, Smartphone, Square } from "lucide-react";
import type { CompositionArtboardPreset } from "../../types/composition";

const presets: Array<{ id: CompositionArtboardPreset; label: string; Icon: typeof Square }> = [
  { id: "auto", label: "AUTO", Icon: RectangleHorizontal },
  { id: "landscape", label: "3:2", Icon: RectangleHorizontal },
  { id: "portrait", label: "3:4", Icon: RectangleVertical },
  { id: "square", label: "1:1", Icon: Square },
  { id: "story", label: "9:16", Icon: Smartphone },
];

export function StudioArtboardControls({ value, onChange }: { value: CompositionArtboardPreset; onChange: (preset: CompositionArtboardPreset) => void }) {
  return (
    <div className="studio-artboard-control" role="group" aria-label="Artboard preset">
      {presets.map(({ id, label, Icon }) => (
        <button type="button" key={id} className={value === id ? "is-active" : undefined} onClick={() => onChange(id)} aria-pressed={value === id}>
          <Icon size={15} aria-hidden="true" /><span>{label}</span>
        </button>
      ))}
    </div>
  );
}
