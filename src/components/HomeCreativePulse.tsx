import { ArrowRight, CircleDot, Gauge, GitBranch, ImagePlus, Sparkles } from "lucide-react";
import { archiveProjects } from "../data/living-archive";
import { PrefetchLink } from "./shared/PrefetchLink";

const pulseItems = [
  { phase: "NOW", title: "Visual OS V5", note: "统一档案、创作与叙事工作流。", icon: Sparkles },
  { phase: "ARCHIVE", title: `${archiveProjects.length} concept studies`, note: "按色彩、天气、材料和技法建立关系。", icon: GitBranch },
  { phase: "STUDIO", title: "Local project memory", note: "自动保存、版本快照与可迁移工程包。", icon: ImagePlus },
  { phase: "RUNTIME", title: "Capability aware", note: "根据设备能力自动控制图像与动效预算。", icon: Gauge },
] as const;

export function HomeCreativePulse() {
  return (
    <section id="creative-pulse" className="home-creative-pulse" aria-labelledby="home-creative-pulse-title">
      <header>
        <span className="platform-index">05 / CURRENT PRACTICE</span>
        <div><h2 id="home-creative-pulse-title">这个项目正在发生什么</h2><p>不是发布后静止的作品集，而是一套持续迭代、可以被打开和使用的视觉练习。</p></div>
      </header>
      <ol>
        {pulseItems.map(({ phase, title, note, icon: Icon }, index) => (
          <li key={phase}>
            <span className="home-creative-pulse__line" aria-hidden="true"><i /><b>{String(index + 1).padStart(2, "0")}</b></span>
            <Icon size={21} aria-hidden="true" />
            <span><small>{phase}</small><strong>{title}</strong><p>{note}</p></span>
          </li>
        ))}
      </ol>
      <div className="home-creative-pulse__actions">
        <PrefetchLink to="/about"><CircleDot size={17} aria-hidden="true" />查看项目原则 <ArrowRight size={17} aria-hidden="true" /></PrefetchLink>
        <PrefetchLink to="/practice">进入练习系统 <ArrowRight size={17} aria-hidden="true" /></PrefetchLink>
      </div>
    </section>
  );
}
