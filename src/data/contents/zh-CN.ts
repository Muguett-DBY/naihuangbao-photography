import { faqs, processSteps } from "../faq";
import { packages, serviceAddOns, servicePolicies } from "../packages";
import { siteConfig } from "../site";
import type { SiteContent } from "../../types/content";

export const defaultSiteContent: SiteContent = {
  siteConfig: { ...siteConfig },
  packages: packages.map((item) => ({ ...item, includes: [...item.includes] })),
  serviceAddOns: {
    equipment: [...serviceAddOns.equipment],
    instantCamera: { ...serviceAddOns.instantCamera },
  },
  servicePolicies: servicePolicies.map((item) => ({ ...item })),
  faqs: faqs.map((item) => ({ ...item })),
  processSteps: [...processSteps],
  whyCards: [
    {
      icon: "heart",
      title: "适合第一次约拍",
      detail: "不用担心不会摆动作，拍摄过程中会给动作、表情和视线引导，节奏会尽量放轻松。",
    },
    {
      icon: "camera",
      title: "柔雾胶片感审美",
      detail: "偏自然光、低饱和、日常记录的照片气质，不做过硬的影楼感。",
    },
    {
      icon: "message",
      title: "拍前沟通边界",
      detail: "拍摄前会沟通风格、服装、地点、参考图和舒适边界，减少临场压力。",
    },
    {
      icon: "shield",
      title: "隐私保护清楚",
      detail: "照片不默认公开，只有获得明确授权才会展示；未经明确授权不会公开客片。",
    },
    {
      icon: "heart",
      title: "全程动作引导",
      detail: "从站姿到眼神方向全程轻声引导。你只需要放松做自己，我来负责构图和节奏。",
    },
    {
      icon: "camera",
      title: "南京本地熟悉",
      detail: "深耕仙林、玄武湖、颐和路、紫金山等出片机位，也能陪你去探索新的角落。",
    },
  ],
  sectionCopy: {
    gallery: {
      eyebrow: "作品风格",
      title: "像翻一本柔和的南京相册",
      intro: "按公园日常、江南感、城市街拍、室内写真和情侣约拍整理，所有公开作品都来自已授权展示的照片。",
    },
    packages: {
      eyebrow: "套餐价格",
      title: "价格清楚，预约前就能看明白",
      intro: "室内写真、室外约拍和拍立得加拍分开列出，每种拍摄方式都包含前期沟通和拍摄引导。",
    },
    details: {
      eyebrow: "Details",
      title: "设备、价格和预约规则写清楚",
      intro: "以下是拍摄设备、附加服务和预约须知，方便你在预约前了解清楚。",
    },
    notice: {
      eyebrow: "约拍流程",
      title: "第一次约拍，也可以按步骤慢慢来",
      intro: "从小红书私信咨询到拍摄、选片和交付，每一步都会提前说清楚，降低临场压力。",
    },
    why: {
      eyebrow: "安心约拍",
      title: "边界清楚，拍摄才会更放松",
      intro: "拍摄前会沟通舒适度和公开授权，现场也会给动作引导，适合第一次拍照的女生。",
    },
    about: {
      eyebrow: "About",
      title: "奶黄包摄影",
      intro: "预约咨询",
      body: "南京个人摄影师，专注女生写真和情侣约拍。拍摄风格偏柔雾胶片感，适合日常记录、江南感写真和轻松陪拍。",
      bookingTitle: "想约一组温柔自然的照片？",
      profileLinkLabel: "查看小红书主页",
    },
    midCta: {
      eyebrow: "Next Step",
      title: "喜欢这种风格吗？",
      intro: "小红书私信聊聊你的想法，回复很快。不用急着确定，有什么问题都可以慢慢聊。",
      actionLabel: "小红书私信咨询",
    },
    footer: {
      tagline: "每一次快门，都是一次温柔照亮。",
    },
    safety: {
      title: "拍摄说明与隐私承诺",
      paragraphs: [
        "不默认公开客片，只有获得明确授权才会展示照片；未经明确授权不会公开客片。",
        "拍摄前会沟通边界、风格和舒适度，现场会给予动作和表情引导，适合第一次拍照的女生。",
      ],
    },
  },
};
