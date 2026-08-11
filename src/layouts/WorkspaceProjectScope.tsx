import type { ReactNode } from "react";
import { WorkspaceProjectProvider } from "../hooks/useWorkspaceProjects";

export default function WorkspaceProjectScope({ children }: { children: ReactNode }) {
  return <WorkspaceProjectProvider>{children}</WorkspaceProjectProvider>;
}
