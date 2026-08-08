import {
  Aperture,
  Bandage,
  Blend,
  Brush,
  Camera,
  Contrast,
  Copy,
  Crosshair,
  Download,
  Droplets,
  Eye,
  Flame,
  Flashlight,
  Focus,
  Gauge,
  Images,
  Layers3,
  MoveHorizontal,
  MoveVertical,
  Paintbrush,
  Palette,
  ScanFace,
  Scissors,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Square,
  SunMedium,
  Thermometer,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import type { BeautyCategory, BeautyTool } from "../types/photo-editor";

export type EditorWorkflowKey = "quick" | "color" | "compose" | "export";

export const EDITOR_WORKFLOW_GROUPS: Array<{
  key: EditorWorkflowKey;
  icon: LucideIcon;
  labelKey: string;
  descKey: string;
  categories: BeautyCategory[];
}> = [
  { key: "quick", icon: WandSparkles, labelKey: "editor.workflow.quick", descKey: "editor.workflow.quickDesc", categories: ["beauty", "reshape"] },
  { key: "color", icon: SlidersHorizontal, labelKey: "editor.workflow.color", descKey: "editor.workflow.colorDesc", categories: ["color", "filter"] },
  { key: "compose", icon: Layers3, labelKey: "editor.workflow.compose", descKey: "editor.workflow.composeDesc", categories: ["tools", "bg", "makeup"] },
  { key: "export", icon: Download, labelKey: "editor.workflow.export", descKey: "editor.workflow.exportDesc", categories: [] },
];

export const EDITOR_CATEGORY_ICONS: Record<BeautyCategory, LucideIcon> = {
  beauty: Sparkles,
  reshape: ScanFace,
  color: Palette,
  filter: Camera,
  tools: SlidersHorizontal,
  bg: Images,
  makeup: Brush,
};

export const EDITOR_TOOL_ICONS: Partial<Record<BeautyTool, LucideIcon>> = {
  smooth: Sparkles,
  whiten: SunMedium,
  sharpen: Focus,
  blemish: Bandage,
  teeth: Smile,
  slim: MoveHorizontal,
  bigeye: Eye,
  nose: ScanFace,
  lip: Smile,
  forehead: MoveVertical,
  facelift: MoveVertical,
  jawline: ScanFace,
  faceWidth: MoveHorizontal,
  faceLength: MoveVertical,
  cheekbone: ScanFace,
  chin: MoveVertical,
  philtrum: MoveVertical,
  eyeDistance: MoveHorizontal,
  eyebag: Eye,
  darkcircle: Eye,
  temperature: Thermometer,
  saturation: Droplets,
  contrast: Contrast,
  brightness: SunMedium,
  vignette: Aperture,
  grain: Gauge,
  blur_bg: Blend,
  bg_remove: Scissors,
  bg_solid: Square,
  bg_gradient: Palette,
  local_bright: Flashlight,
  local_warm: Flame,
  local_sat: Droplets,
  color_splash: Crosshair,
  double_exposure: Copy,
  lipstick: Smile,
  blush: Brush,
  eyeshadow: Eye,
  eyeliner: Paintbrush,
};
