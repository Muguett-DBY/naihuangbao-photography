import { Cloud, CloudDownload, CloudUpload, GitBranch, LogIn, RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../../hooks/useAuth";
import { useWorkspaceProjects } from "../../hooks/useWorkspaceProjects";
import {
  fetchSyncedProject,
  flushSyncQueue,
  getLocalSyncRevision,
  listSyncedProjectVersions,
  ProjectSyncConflict,
  queueWorkspaceSync,
  syncWorkspaceProject,
} from "../../lib/project-sync";
import type { ProjectSyncReceipt, ProjectSyncVersion } from "../../types/project-sync";
import type { WorkspaceProject } from "../../types/workspace-project";
import { PrefetchLink } from "../shared/PrefetchLink";

export function ProjectSyncPanel({ project }: { project: WorkspaceProject }) {
  return (
    <AuthProvider>
      <ProjectSyncPanelContent project={project} />
    </AuthProvider>
  );
}

function ProjectSyncPanelContent({ project }: { project: WorkspaceProject }) {
  const auth = useAuth();
  const workspace = useWorkspaceProjects();
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<ProjectSyncReceipt | null>(() => {
    const revision = getLocalSyncRevision(project.id);
    return revision ? { projectId: project.id, ...revision, uploadedAssets: 0, skippedAssets: 0 } : null;
  });
  const [versions, setVersions] = useState<ProjectSyncVersion[]>([]);
  const [conflict, setConflict] = useState<ProjectSyncConflict | null>(null);

  useEffect(() => {
    setReceipt(() => {
      const revision = getLocalSyncRevision(project.id);
      return revision ? { projectId: project.id, ...revision, uploadedAssets: 0, skippedAssets: 0 } : null;
    });
    setVersions([]);
    setConflict(null);
    if (auth.user) void listSyncedProjectVersions(project.id).then(setVersions).catch(() => undefined);
  }, [auth.user?.id, project.id]);

  useEffect(() => {
    if (!auth.user) return;
    const flush = () => void flushSyncQueue().then(({ completed }) => { if (completed) setNotice(`${completed} queued sync job restored.`); });
    window.addEventListener("online", flush);
    if (navigator.onLine) flush();
    return () => window.removeEventListener("online", flush);
  }, [auth.user?.id]);

  const runSync = async (expectedRevision?: number) => {
    setSyncing(true);
    setConflict(null);
    setNotice("Syncing project and eligible vault originals...");
    try {
      const next = await syncWorkspaceProject(project, expectedRevision);
      setReceipt(next);
      setVersions(await listSyncedProjectVersions(project.id));
      setNotice(`Cloud revision ${next.revision} saved / ${next.uploadedAssets} originals uploaded${next.skippedAssets ? ` / ${next.skippedAssets} skipped` : ""}.`);
      workspace.checkpoint(`Synced cloud revision ${next.revision}`, "publish");
    } catch (error) {
      if (error instanceof ProjectSyncConflict) {
        setConflict(error);
        setNotice("A newer cloud revision exists. Choose which copy should lead.");
      } else if (!navigator.onLine || error instanceof TypeError) {
        await queueWorkspaceSync(project, expectedRevision);
        setNotice("Offline: this project was added to the local sync queue.");
      } else {
        setNotice(error instanceof Error ? error.message : "Project sync failed.");
      }
    } finally {
      setSyncing(false);
    }
  };

  const pullCloud = async (revision?: number) => {
    setSyncing(true);
    try {
      const snapshot = await fetchSyncedProject(project.id, revision);
      workspace.importProject({ ...snapshot.project, lastOpenedAt: Date.now(), updatedAt: Date.now() });
      setReceipt({ projectId: project.id, revision: snapshot.revision, contentHash: snapshot.contentHash, updatedAt: snapshot.updatedAt, uploadedAssets: 0, skippedAssets: 0 });
      setConflict(null);
      setNotice(`Cloud revision ${snapshot.revision} restored locally.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Cloud restore failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="project-sync" aria-labelledby="project-sync-title">
      <header><div><span>03 / CLOUD CONTINUITY</span><h2 id="project-sync-title">Continue on another device</h2></div><p>Optional account sync stores immutable project revisions. Local work remains usable offline.</p></header>
      {!auth.user ? (
        <div className="project-sync__signin"><LogIn size={21} aria-hidden="true" /><div><strong>Sign in when you want continuity.</strong><p>No account is required for local creation.</p></div><PrefetchLink to="/login">SIGN IN</PrefetchLink></div>
      ) : (
        <>
          <div className="project-sync__status">
            <span className={navigator.onLine ? "is-online" : "is-offline"}>{navigator.onLine ? <Cloud size={19} aria-hidden="true" /> : <WifiOff size={19} aria-hidden="true" />}<strong>{navigator.onLine ? "CLOUD READY" : "OFFLINE QUEUE"}</strong></span>
            <span><GitBranch size={19} aria-hidden="true" /><strong>REVISION {receipt?.revision ?? 0}</strong><small>{receipt?.updatedAt ? new Date(receipt.updatedAt).toLocaleString() : "LOCAL ONLY"}</small></span>
            <button type="button" onClick={() => void runSync()} disabled={syncing}><CloudUpload size={17} aria-hidden="true" />{syncing ? "SYNCING" : "SYNC NOW"}</button>
          </div>
          {conflict ? <div className="project-sync__conflict"><RefreshCw size={19} aria-hidden="true" /><div><strong>Cloud revision {conflict.remoteRevision} is newer.</strong><p>Pull it into this browser, or deliberately replace it with the current local project.</p></div><button type="button" onClick={() => void pullCloud()}><CloudDownload size={16} aria-hidden="true" />PULL CLOUD</button><button type="button" onClick={() => void runSync(conflict.remoteRevision)}><CloudUpload size={16} aria-hidden="true" />USE LOCAL</button></div> : null}
          {notice ? <p className="project-sync__notice" role="status">{notice}</p> : null}
          {versions.length ? <div className="project-sync__versions">{versions.slice(0, 8).map((version) => <article key={version.revision}><span>R{String(version.revision).padStart(2, "0")}</span><strong>{new Date(version.updatedAt).toLocaleString()}</strong><small>{version.contentHash.slice(0, 12)}</small><button type="button" onClick={() => void pullCloud(version.revision)}><CloudDownload size={14} aria-hidden="true" />RESTORE</button></article>)}</div> : null}
        </>
      )}
    </section>
  );
}
