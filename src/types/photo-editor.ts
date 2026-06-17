export type BeautyCategory = "beauty" | "reshape" | "color" | "filter" | "tools" | "bg" | "makeup";

export type BeautyTool =
  | "smooth" | "slim" | "bigeye" | "whiten" | "sharpen"
  | "nose" | "lip" | "forehead" | "eyebag" | "darkcircle"
  | "blemish" | "facelift" | "jawline" | "faceWidth" | "eyeDistance" | "faceLength" | "cheekbone" | "chin" | "philtrum"
  | "temperature" | "saturation" | "contrast" | "brightness" | "vignette" | "grain"
  | "teeth" | "blur_bg"
  | "bg_remove" | "bg_solid" | "bg_gradient"
  | "lipstick" | "blush" | "eyeshadow" | "eyeliner"
  | "local_bright" | "local_warm" | "local_sat"
  | "color_splash"
  | "double_exposure";

export interface BeautySettings {
  [key: string]: number;
  smooth: number; slim: number; bigeye: number; whiten: number; sharpen: number;
  nose: number; lip: number; forehead: number; eyebag: number; darkcircle: number;
  blemish: number; facelift: number; jawline: number;
  faceWidth: number; eyeDistance: number; faceLength: number; cheekbone: number; chin: number; philtrum: number;
  temperature: number; saturation: number; contrast: number; brightness: number; vignette: number; grain: number;
  teeth: number; blur_bg: number;
  bg_remove: number; bg_solid: number; bg_gradient: number;
  lipstick: number; blush: number; eyeshadow: number; eyeliner: number;
  local_bright: number; local_warm: number; local_sat: number;
  color_splash: number;
  double_exposure: number;
}

export interface FilterPreset { name: string; icon: string; settings: Partial<BeautySettings>; }

export interface FrameOption { id: string; labelKey: string; padding: number; bg: string; paddingBottom?: number; borderRadius?: number; }

export interface CategoryDef { key: BeautyCategory; icon: string; labelKey: string; }

export interface ToolDef { key: BeautyTool; icon: string; labelKey: string; }
