export type ProductRoute = {
  id: string;
  to: string;
  labelKey: string;
  descriptionKey: string;
  keywords: string[];
};

export const primaryNavigation: ProductRoute[] = [
  { id: "home", to: "/", labelKey: "nav.home", descriptionKey: "platform.routes.home", keywords: ["home", "首页", "start"] },
  { id: "archive", to: "/archive", labelKey: "nav.archive", descriptionKey: "platform.routes.archive", keywords: ["archive", "档案", "photos", "作品"] },
  { id: "stories", to: "/stories", labelKey: "nav.stories", descriptionKey: "platform.routes.stories", keywords: ["stories", "故事", "journal", "notes"] },
  { id: "create", to: "/create", labelKey: "nav.create", descriptionKey: "platform.routes.create", keywords: ["create", "创作", "studio", "darkroom", "contact sheet", "filmstrip"] },
  { id: "about", to: "/about", labelKey: "nav.about", descriptionKey: "platform.routes.about", keywords: ["about", "关于", "project"] },
];

export const practiceNavigation: ProductRoute[] = [
  { id: "studio", to: "/studio", labelKey: "nav.studio", descriptionKey: "platform.routes.studio", keywords: ["studio", "排版", "contact sheet", "filmstrip"] },
  { id: "lab", to: "/lab", labelKey: "nav.lab", descriptionKey: "platform.routes.lab", keywords: ["lab", "实验室", "tools", "practice"] },
  { id: "gallery", to: "/gallery", labelKey: "nav.gallery", descriptionKey: "platform.practice.gallery", keywords: ["gallery", "客片", "portfolio"] },
  { id: "editor", to: "/editor", labelKey: "nav.editor", descriptionKey: "platform.practice.editor", keywords: ["editor", "修图", "darkroom"] },
  { id: "compare", to: "/compare", labelKey: "photoCompare.title", descriptionKey: "platform.practice.compare", keywords: ["compare", "对比", "before after"] },
  { id: "courses", to: "/courses", labelKey: "nav.courses", descriptionKey: "platform.practice.courses", keywords: ["courses", "课程", "learning"] },
  { id: "presets", to: "/products", labelKey: "nav.presets", descriptionKey: "platform.practice.presets", keywords: ["presets", "预设", "color"] },
  { id: "workshops", to: "/workshops", labelKey: "nav.workshops", descriptionKey: "platform.practice.workshops", keywords: ["workshops", "活动", "events"] },
  { id: "shop", to: "/shop", labelKey: "nav.shop", descriptionKey: "platform.practice.shop", keywords: ["shop", "周边", "prints"] },
  { id: "booking", to: "/booking", labelKey: "nav.booking", descriptionKey: "platform.practice.booking", keywords: ["booking", "预约", "calendar"] },
  { id: "map", to: "/map", labelKey: "nav.map", descriptionKey: "platform.practice.map", keywords: ["map", "地图", "locations"] },
  { id: "account", to: "/login", labelKey: "auth.login", descriptionKey: "platform.practice.account", keywords: ["account", "登录", "dashboard"] },
];
