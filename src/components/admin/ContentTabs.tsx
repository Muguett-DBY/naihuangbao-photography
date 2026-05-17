import type { ContentKey, SiteContent } from "../../types/content";

export type ContentTabsProps = {
  content: SiteContent;
  onSave: (label: string, keys: ContentKey[]) => void;
};

export function ContentTabs(_props: ContentTabsProps) {
  return null;
}
