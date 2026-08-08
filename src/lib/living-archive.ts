import type { ArchiveProject } from "../types/living-archive";

export type ArchiveFilters = {
  place: string;
  season: string;
  mood: string;
  palette: string;
  technique: string;
  medium: string;
  query: string;
};

export type ArchiveFacet = Exclude<keyof ArchiveFilters, "query">;

const emptyFilters: ArchiveFilters = {
  place: "all",
  season: "all",
  mood: "all",
  palette: "all",
  technique: "all",
  medium: "all",
  query: "",
};

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function createArchiveView(projects: ArchiveProject[], filters: Partial<ArchiveFilters> = {}) {
  const active = { ...emptyFilters, ...filters };
  const query = normalizeSearchText(active.query);
  const filtered = projects.filter((project) => (
    (active.place === "all" || project.place === active.place)
    && (active.season === "all" || project.season === active.season)
    && (active.mood === "all" || project.moods.includes(active.mood))
    && (active.palette === "all" || project.palette.includes(active.palette))
    && (active.technique === "all" || project.techniques.includes(active.technique))
    && (active.medium === "all" || project.mediums.includes(active.medium))
    && (!query || createProjectSearchText(project).includes(query))
  ));

  return {
    active,
    projects: filtered,
    facets: {
      place: unique(projects.map((project) => project.place)),
      season: unique(projects.map((project) => project.season)),
      mood: unique(projects.flatMap((project) => project.moods)),
      palette: unique(projects.flatMap((project) => project.palette)),
      technique: unique(projects.flatMap((project) => project.techniques)),
      medium: unique(projects.flatMap((project) => project.mediums)),
    },
  };
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase("zh-CN").normalize("NFKC");
}

export function createProjectSearchText(project: ArchiveProject) {
  return normalizeSearchText([
    project.title,
    project.subtitle,
    project.summary,
    project.statement,
    project.place,
    project.season,
    ...project.moods,
    ...project.palette,
    ...project.techniques,
    ...project.mediums,
    ...project.keywords,
    ...project.process.flatMap((step) => [step.title, step.note]),
  ].join(" "));
}
