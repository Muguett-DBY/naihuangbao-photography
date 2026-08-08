import generatedStories from "./visual-stories.generated.json";
import type { VisualStory } from "../types/visual-story";

export const visualStories = generatedStories as VisualStory[];

export function getVisualStory(id: string | undefined) {
  return visualStories.find((story) => story.id === id);
}
