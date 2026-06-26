import type { BeautySettings, FilterPreset, FrameOption, CategoryDef, ToolDef, BeautyCategory, BeautyTool } from "../types/photo-editor";

export const MAX_HISTORY = 20;

export const INITIAL: BeautySettings = {
  smooth: 0, slim: 0, bigeye: 0, whiten: 0, sharpen: 0,
  nose: 0, lip: 0, forehead: 0, eyebag: 0, darkcircle: 0,
  blemish: 0, facelift: 0, jawline: 0,
  faceWidth: 0, eyeDistance: 0, faceLength: 0, cheekbone: 0, chin: 0, philtrum: 0,
  temperature: 0, saturation: 0, contrast: 0, brightness: 0, vignette: 0, grain: 0,
  teeth: 0, blur_bg: 0,
  bg_remove: 0, bg_solid: 0, bg_gradient: 0,
  lipstick: 0, blush: 0, eyeshadow: 0, eyeliner: 0,
  local_bright: 0, local_warm: 0, local_sat: 0,
  color_splash: 0,
  double_exposure: 0,
};

export const FILTERS: FilterPreset[] = [
  { name: "editor.filter.natural", icon: "🌿", settings: { smooth: 50, whiten: 20 } },
  { name: "editor.filter.beauty", icon: "💄", settings: { smooth: 70, slim: 25, bigeye: 15, whiten: 35 } },
  { name: "editor.filter.portrait", icon: "📸", settings: { smooth: 35, sharpen: 20, contrast: 10 } },
  { name: "editor.filter.vintage", icon: "🎞", settings: { smooth: 40, temperature: -25, saturation: -10, vignette: 30 } },
  { name: "editor.filter.film", icon: "🎬", settings: { smooth: 30, temperature: -15, saturation: -20, grain: 25, contrast: 15 } },
  { name: "editor.filter.japanese", icon: "🇯🇵", settings: { smooth: 45, whiten: 25, temperature: 10, saturation: -15, brightness: 10 } },
  { name: "editor.filter.hongkong", icon: "🇭🇰", settings: { smooth: 35, contrast: 20, saturation: 15, temperature: -10 } },
  { name: "editor.filter.bw", icon: "⬛", settings: { saturation: -100, contrast: 25 } },
  { name: "editor.filter.cool", icon: "❄", settings: { temperature: -30, saturation: -10, brightness: 5 } },
  { name: "editor.filter.warm", icon: "☀", settings: { temperature: 25, saturation: 10, brightness: 5 } },
  { name: "editor.filter.hicontrast", icon: "🌗", settings: { contrast: 35, saturation: 10, sharpen: 15 } },
  { name: "editor.filter.dreamy", icon: "🌙", settings: { smooth: 60, whiten: 30, brightness: 15, vignette: 20, grain: 10 } },
];

export const FRAMES: FrameOption[] = [
  { id: "none", labelKey: "editor.frame.none", padding: 0, bg: "transparent" },
  { id: "polaroid", labelKey: "editor.frame.polaroid", padding: 40, bg: "#f5f5f5", paddingBottom: 60 },
  { id: "film", labelKey: "editor.frame.film", padding: 16, bg: "#111" },
  { id: "white", labelKey: "editor.frame.white", padding: 20, bg: "#fff" },
  { id: "rounded", labelKey: "editor.frame.rounded", padding: 0, bg: "transparent", borderRadius: 24 },
  { id: "magazine", labelKey: "editor.frame.magazine", padding: 8, bg: "#fafafa" },
  { id: "golden", labelKey: "editor.frame.golden", padding: 0, bg: "#1a1a1a" },
];

export const STICKERS = ["❤", "⭐", "🌟", "✨", "🌸", "🌺", "🦋", "🎀", "👑", "💫", "🌈", "🎵", "🔥", "💯", "🎉", "📸", "🎬", "🎞"];

export const CATEGORIES: CategoryDef[] = [
  { key: "beauty", icon: "✨", labelKey: "editor.cat.beauty" },
  { key: "reshape", icon: "💎", labelKey: "editor.cat.reshape" },
  { key: "color", icon: "🎨", labelKey: "editor.cat.color" },
  { key: "filter", icon: "📷", labelKey: "editor.cat.filter" },
  { key: "tools", icon: "🛠", labelKey: "editor.cat.tools" },
  { key: "bg", icon: "🖼", labelKey: "editor.cat.bg" },
  { key: "makeup", icon: "💄", labelKey: "editor.cat.makeup" },
];

export const CATEGORY_DESCRIPTIONS: Record<BeautyCategory, string> = {
  beauty: "editor.catDesc.beauty",
  reshape: "editor.catDesc.reshape",
  color: "editor.catDesc.color",
  filter: "editor.catDesc.filter",
  tools: "editor.catDesc.tools",
  bg: "editor.catDesc.bg",
  makeup: "editor.catDesc.makeup",
};

export const TOOLS: Record<BeautyCategory, ToolDef[]> = {
  beauty: [
    { key: "smooth", icon: "✨", labelKey: "editor.smooth" },
    { key: "whiten", icon: "☁", labelKey: "editor.whiten" },
    { key: "sharpen", icon: "🔲", labelKey: "editor.sharpen" },
    { key: "blemish", icon: "🩹", labelKey: "editor.blemish" },
    { key: "teeth", icon: "🦷", labelKey: "editor.teeth" },
  ],
  reshape: [
    { key: "slim", icon: "↔", labelKey: "editor.slim" },
    { key: "bigeye", icon: "👁", labelKey: "editor.bigeye" },
    { key: "nose", icon: "👃", labelKey: "editor.nose" },
    { key: "lip", icon: "👄", labelKey: "editor.lip" },
    { key: "forehead", icon: "↕", labelKey: "editor.forehead" },
    { key: "facelift", icon: "⬆", labelKey: "editor.facelift" },
    { key: "jawline", icon: "🦴", labelKey: "editor.jawline" },
    { key: "faceWidth", icon: "↔", labelKey: "editor.faceWidth" },
    { key: "faceLength", icon: "↕", labelKey: "editor.faceLength" },
    { key: "cheekbone", icon: "🫦", labelKey: "editor.cheekbone" },
    { key: "chin", icon: "⬇", labelKey: "editor.chin" },
    { key: "philtrum", icon: "👆", labelKey: "editor.philtrum" },
    { key: "eyeDistance", icon: "👁‍🗨", labelKey: "editor.eyeDistance" },
    { key: "eyebag", icon: "👁", labelKey: "editor.eyebag" },
    { key: "darkcircle", icon: "🌑", labelKey: "editor.darkcircle" },
  ],
  color: [
    { key: "temperature", icon: "🌡", labelKey: "editor.temperature" },
    { key: "saturation", icon: "🎨", labelKey: "editor.saturation" },
    { key: "contrast", icon: "🌗", labelKey: "editor.contrast" },
    { key: "brightness", icon: "☀", labelKey: "editor.brightness" },
    { key: "vignette", icon: "🌑", labelKey: "editor.vignette" },
    { key: "grain", icon: "📷", labelKey: "editor.grain" },
  ],
  filter: [
    { key: "smooth", icon: "✨", labelKey: "editor.smooth" },
    { key: "whiten", icon: "☁", labelKey: "editor.whiten" },
    { key: "sharpen", icon: "🔲", labelKey: "editor.sharpen" },
    { key: "vignette", icon: "🌑", labelKey: "editor.vignette" },
  ],
  tools: [
    { key: "blur_bg", icon: "🌫", labelKey: "editor.blur_bg" },
    { key: "bg_remove", icon: "✂", labelKey: "editor.bg_remove" },
    { key: "bg_solid", icon: "🟦", labelKey: "editor.bg_solid" },
    { key: "bg_gradient", icon: "🌈", labelKey: "editor.bg_gradient" },
    { key: "local_bright", icon: "🔆", labelKey: "editor.local_bright" },
    { key: "local_warm", icon: "🔥", labelKey: "editor.local_warm" },
    { key: "local_sat", icon: "💧", labelKey: "editor.local_sat" },
    { key: "color_splash", icon: "🎯", labelKey: "editor.color_splash" },
    { key: "double_exposure", icon: "🔄", labelKey: "editor.double_exposure" },
  ],
  bg: [
    { key: "blur_bg", icon: "🌫", labelKey: "editor.blur_bg" },
    { key: "bg_remove", icon: "✂", labelKey: "editor.bg_remove" },
    { key: "bg_solid", icon: "🟦", labelKey: "editor.bg_solid" },
    { key: "bg_gradient", icon: "🌈", labelKey: "editor.bg_gradient" },
  ],
  makeup: [
    { key: "lipstick", icon: "💄", labelKey: "editor.lipstick" },
    { key: "blush", icon: "🌸", labelKey: "editor.blush" },
    { key: "eyeshadow", icon: "🎨", labelKey: "editor.eyeshadow" },
    { key: "eyeliner", icon: "✏", labelKey: "editor.eyeliner" },
  ],
};
