import type { ArchiveProject } from "../types/living-archive";

export type ArchiveFilters = {
  place: string;
  season: string;
  mood: string;
  palette: string;
};

export type ArchiveFacet = keyof ArchiveFilters;

const emptyFilters: ArchiveFilters = { place: "all", season: "all", mood: "all", palette: "all" };

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function createArchiveView(projects: ArchiveProject[], filters: Partial<ArchiveFilters> = {}) {
  const active = { ...emptyFilters, ...filters };
  const filtered = projects.filter((project) => (
    (active.place === "all" || project.place === active.place)
    && (active.season === "all" || project.season === active.season)
    && (active.mood === "all" || project.moods.includes(active.mood))
    && (active.palette === "all" || project.palette.includes(active.palette))
  ));

  return {
    active,
    projects: filtered,
    facets: {
      place: unique(projects.map((project) => project.place)),
      season: unique(projects.map((project) => project.season)),
      mood: unique(projects.flatMap((project) => project.moods)),
      palette: unique(projects.flatMap((project) => project.palette)),
    },
  };
}
