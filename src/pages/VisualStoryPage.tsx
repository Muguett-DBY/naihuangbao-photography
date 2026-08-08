import "../styles/story-v2.css";
import { useParams } from "react-router";
import { VisualStoryReader } from "../components/stories/VisualStoryReader";
import { NotFound } from "../components/NotFound";
import { getVisualStory } from "../data/visual-stories";
import { useSEO } from "../hooks/useSEO";

export function VisualStoryPage() {
  const { id } = useParams();
  const story = getVisualStory(id);
  useSEO({
    title: story?.title ?? "Stories",
    descKey: "platform.stories.description",
    path: story ? `/stories/${story.id}` : "/stories",
    image: story?.chapters[0]?.media[0]?.src,
    imageAlt: story?.chapters[0]?.media[0]?.alt,
  });
  return story ? <VisualStoryReader story={story} /> : <NotFound />;
}
