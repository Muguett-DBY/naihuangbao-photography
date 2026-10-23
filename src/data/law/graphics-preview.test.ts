import { describe, expect, it } from "vitest";
import { LAW_GRAPHICS } from "./graphics";
import { LAW_GRAPHIC_PREVIEWS, graphicPreviewsOfSubject } from "./graphics-preview";
import { LAW_SUBJECTS } from "./meta";

describe("generated graphic previews", () => {
  it("preserves every displayed field and the catalogue order", () => {
    expect(LAW_GRAPHIC_PREVIEWS).toHaveLength(LAW_GRAPHICS.length);
    LAW_GRAPHICS.forEach((graphic, index) => {
      expect(LAW_GRAPHIC_PREVIEWS[index]).toEqual({
        lessonId: graphic.lessonId, subject: graphic.subject, title: graphic.title,
        kind: graphic.kind, intro: graphic.intro,
      });
    });
  });

  it.each(LAW_SUBJECTS)("keeps the complete $id list for subject cards and path badges", ({ id }) => {
    expect(graphicPreviewsOfSubject(id).map(({ lessonId }) => lessonId))
      .toEqual(LAW_GRAPHICS.filter(({ subject }) => subject === id).map(({ lessonId }) => lessonId));
  });

  it("keeps animation payloads out of the preview and below half the full catalogue size", () => {
    expect(LAW_GRAPHIC_PREVIEWS.every((graphic) => !('nodes' in graphic) && !('captions' in graphic))).toBe(true);
    expect(JSON.stringify(LAW_GRAPHIC_PREVIEWS).length).toBeLessThan(JSON.stringify(LAW_GRAPHICS).length / 2);
  });
});
