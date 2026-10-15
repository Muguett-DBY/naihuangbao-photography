import type { ClassroomScene } from "../../../lib/law-classroom";
import type { LawSubjectId } from "../../../types/law";
import { C } from "../../../remotion/theme";
import { ConceptScene } from "../../../remotion/scenes/ConceptScene";
import { ListScene } from "../../../remotion/scenes/ListScene";
import { CompareScene, type CompareRow } from "../../../remotion/scenes/CompareScene";
import { FlowScene } from "../../../remotion/scenes/FlowScene";
import { MnemonicScene } from "../../../remotion/scenes/MnemonicScene";
import { TimelineScene, type TimelineEvent } from "../../../remotion/scenes/TimelineScene";

/**
 * SceneView — 单场课堂场景 → 对应的 Remotion 场景组件（帧驱动，确定性渲染）。
 * 从 ClassroomPlayer 拆出的纯映射层：讲稿/条目文本的解析 helper 一并放在这里。
 */

/** "概念甲与概念乙"式标题拆两栏；拆不开用兜底栏名 */
function splitCompareTitles(title: string): [string, string] {
  const m = /^([^与和]{2,10})[与和]([^与和]{2,10})$/.exec(title.trim());
  if (m) return [m[1], m[2]];
  return ["概念甲", "概念乙"];
}

/** "维度：甲值 ↔ 乙值" → 对比行；任一条解析不出返回 null（整场退回列表） */
function parseCompareRows(items: readonly string[]): CompareRow[] | null {
  if (items.length === 0) return null;
  const rows: CompareRow[] = [];
  for (const item of items) {
    const at = item.indexOf("↔");
    if (at < 0) return null;
    const clean = (side: string) => side.replace(/^[^：:]{1,14}[：:]/, "").trim();
    const left = clean(item.slice(0, at));
    const right = clean(item.slice(at + 1));
    if (!left || !right) return null;
    rows.push({ left, right });
  }
  return rows;
}

/** "时点：事件" → 时间线事件；没有冒号就整条作事件文本 */
function parseTimelineEvent(item: string): TimelineEvent {
  const at = item.search(/[：:]/);
  if (at <= 0) return { time: "·", event: item };
  return { time: item.slice(0, at).trim(), event: item.slice(at + 1).trim() };
}

/** 记忆卡拆分：首行口诀，其余行作解释；单行时解释留空（时长估算也要用） */
export function splitMnemonic(content: string): [string, string] {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) return [lines[0], lines.slice(1).join(" ")];
  return [content.trim(), ""];
}

/** 正文按空行/换行拆段（ConceptScene 逐段入场） */
function paragraphsOf(content: string): string[] {
  return content.split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

/** 单场场景 → 对应的 Remotion 场景组件（帧驱动，确定性渲染） */
export function SceneView({
  scene,
  accent,
  subject,
  sceneIndex,
  sceneTotal,
}: {
  scene: ClassroomScene;
  accent: string;
  /** 学科 id：接通场景粉彩 token 与 SceneChrome 学科淡晕（缺省时场景自混兜底） */
  subject?: LawSubjectId;
  /** 第几场（0-based，SceneChrome 进度点） */
  sceneIndex?: number;
  /** 共几场（0 时 chrome 不画进度点） */
  sceneTotal?: number;
}) {
  switch (scene.type) {
    case "compare": {
      const rows = parseCompareRows(scene.items);
      if (rows) {
        const [leftTitle, rightTitle] = splitCompareTitles(scene.title);
        return (
          <CompareScene
            leftTitle={leftTitle}
            rightTitle={rightTitle}
            rows={rows}
            rightAccent={accent}
            accent={accent}
            subject={subject}
            sceneIndex={sceneIndex}
            sceneTotal={sceneTotal}
          />
        );
      }
      return (
        <ListScene
          title={scene.title}
          items={scene.items}
          accent={accent}
          subject={subject}
          sceneIndex={sceneIndex}
          sceneTotal={sceneTotal}
        />
      );
    }
    case "timeline":
      return (
        <TimelineScene
          title={scene.title}
          events={scene.items.map(parseTimelineEvent)}
          accent={accent}
          subject={subject}
          sceneIndex={sceneIndex}
          sceneTotal={sceneTotal}
        />
      );
    case "flow":
      return (
        <FlowScene
          title={scene.title}
          steps={scene.items}
          accent={accent}
          subject={subject}
          sceneIndex={sceneIndex}
          sceneTotal={sceneTotal}
        />
      );
    case "mnemonic": {
      const [mnemonic, explanation] = splitMnemonic(scene.content);
      return (
        <MnemonicScene
          mnemonic={mnemonic}
          explanation={explanation}
          accent={accent}
          subject={subject}
          sceneIndex={sceneIndex}
          sceneTotal={sceneTotal}
        />
      );
    }
    case "alert":
      // 例外/易错：警示色（theme.C.err）压过学科色，视觉上先声夺人
      return (
        <ConceptScene
          title={scene.title}
          content={paragraphsOf(scene.content)}
          keyTerms={scene.keyTerms}
          accent={C.err}
          sceneIndex={sceneIndex}
          sceneTotal={sceneTotal}
        />
      );
    case "list":
    case "checklist":
    case "quiz":
      // quiz 场景在课堂视频里只作"考点预告"逐条展示，互动测验仍由课时页承接
      return (
        <ListScene
          title={scene.title}
          items={scene.items.length > 0 ? scene.items : paragraphsOf(scene.content)}
          accent={accent}
          subject={subject}
          sceneIndex={sceneIndex}
          sceneTotal={sceneTotal}
        />
      );
    default:
      return (
        <ConceptScene
          title={scene.title}
          content={paragraphsOf(scene.content)}
          keyTerms={scene.keyTerms}
          accent={accent}
          subject={subject}
          sceneIndex={sceneIndex}
          sceneTotal={sceneTotal}
        />
      );
  }
}
