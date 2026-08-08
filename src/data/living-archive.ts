import projects from "./archive-projects.generated.json";
import type { ArchiveProject } from "../types/living-archive";

export const archiveProjects = projects as ArchiveProject[];
