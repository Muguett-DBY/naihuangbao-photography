import previews from "./graphics-preview.generated.json";
import type { LawGraphic, LawSubjectId } from "../../types/law";

type LawGraphicPreview = Pick<LawGraphic, "lessonId" | "subject" | "title" | "kind" | "intro">;

export const LAW_GRAPHIC_PREVIEWS = previews as readonly LawGraphicPreview[];

export function graphicPreviewsOfSubject(subject: LawSubjectId): readonly LawGraphicPreview[] {
  return LAW_GRAPHIC_PREVIEWS.filter((graphic) => graphic.subject === subject);
}
