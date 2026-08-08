export type ArchiveKind = "concept";

export type ArchiveMedia = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type ArchiveProject = {
  id: string;
  kind: ArchiveKind;
  title: string;
  subtitle: string;
  chapter: string;
  year: number;
  summary: string;
  place: string;
  season: string;
  moods: string[];
  palette: string[];
  media: ArchiveMedia[];
};

export type ArchiveManifestEntry = ArchiveProject & {
  media: Array<ArchiveMedia & {
    avif: string;
    responsive: {
      width640: string;
      width960: string;
    };
  }>;
};

export type ArchiveManifest = {
  schemaVersion: 1;
  generatedFrom: string;
  projects: ArchiveManifestEntry[];
};
