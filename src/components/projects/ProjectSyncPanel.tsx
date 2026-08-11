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
import { useWorkspaceCopy } from "../../i18n/workspace-copy";
import { PrefetchLink } from "../shared/PrefetchLink";

export function ProjectSyncPanel({ project }: { project: WorkspaceProject }) {
  return (
    <AuthProvider>
      <ProjectSyncPanelContent project={project} />
    </AuthProvider>
  );
}

function ProjectSyncPanelContent({ project }: { project: WorkspaceProject }) {
  const { text, locale } = useWorkspaceCopy();
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
    const flush = () => void flushSyncQueue().then(({ completed }) => { if (completed) setNotice(text("queuedSyncRestored", { count: completed })); });
    window.addEventListener("online", flush);
    if (navigator.onLine) flush();
    return () => window.removeEventListener("online", flush);
  }, [auth.user?.id, text]);

  const runSync = async (expectedRevision?: number) => {
    setSyncing(true);
    setConflict(null);
    setNotice(text("syncingProject"));
    try {
      const next = await syncWorkspaceProject(project, expectedRevision);
      setReceipt(next);
      setVersions(await listSyncedProjectVersions(project.id));
      setNotice(text("cloudRevisionSaved", {
        revision: next.revision,
        uploaded: next.uploadedAssets,
        skipped: next.skippedAssets ? text("skippedOriginals", { count: next.skippedAssets }) : "",
      }));
      workspace.checkpoint(text("syncedCheckpoint", { revision: next.revision }), "publish");
    } catch (error) {
      if (error instanceof ProjectSyncConflict) {
        setConflict(error);
        setNotice(text("newerCloudNotice"));
      } else if (!navigator.onLine || error instanceof TypeError) {
        await queueWorkspaceSync(project, expectedRevision);
        setNotice(text("offlineQueued"));
      } else {
        setNotice(error instanceof Error ? error.message : text("projectSyncFailed"));
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
      setNotice(text("cloudRevisionRestored", { revision: snapshot.revision }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : text("cloudRestoreFailed"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="project-sync" aria-labelledby="project-sync-title">
      <header><div><span>03 / {text("cloudContinuity")}</span><h2 id="project-sync-title">{text("continueAnotherDevice")}</h2></div><p>{text("syncIntro")}</p></header>
      {!auth.user ? (
        <div className="project-sync__signin"><LogIn size={21} aria-hidden="true" /><div><strong>{text("signInContinuity")}</strong><p>{text("noAccountRequired")}</p></div><PrefetchLink to="/login">{text("signIn")}</PrefetchLink></div>
      ) : (
        <>
          <div className="project-sync__status">
            <span className={navigator.onLine ? "is-online" : "is-offline"}>{navigator.onLine ? <Cloud size={19} aria-hidden="true" /> : <WifiOff size={19} aria-hidden="true" />}<strong>{navigator.onLine ? text("cloudReady") : text("offlineQueue")}</strong></span>
            <span><GitBranch size={19} aria-hidden="true" /><strong>{text("revisionNumber", { revision: receipt?.revision ?? 0 })}</strong><small>{receipt?.updatedAt ? new Date(receipt.updatedAt).toLocaleString(locale) : text("localOnlyShort")}</small></span>
            <button type="button" onClick={() => void runSync()} disabled={syncing}><CloudUpload size={17} aria-hidden="true" />{syncing ? text("syncingShort") : text("syncNow")}</button>
          </div>
          {conflict ? <div className="project-sync__conflict"><RefreshCw size={19} aria-hidden="true" /><div><strong>{text("cloudRevisionNewer", { revision: conflict.remoteRevision })}</strong><p>{text("syncConflictHint")}</p></div><button type="button" onClick={() => void pullCloud()}><CloudDownload size={16} aria-hidden="true" />{text("pullCloud")}</button><button type="button" onClick={() => void runSync(conflict.remoteRevision)}><CloudUpload size={16} aria-hidden="true" />{text("useLocal")}</button></div> : null}
          {notice ? <p className="project-sync__notice" role="status">{notice}</p> : null}
          {versions.length ? <div className="project-sync__versions">{versions.slice(0, 8).map((version) => <article key={version.revision}><span>R{String(version.revision).padStart(2, "0")}</span><strong>{new Date(version.updatedAt).toLocaleString(locale)}</strong><small>{version.contentHash.slice(0, 12)}</small><button type="button" onClick={() => void pullCloud(version.revision)}><CloudDownload size={14} aria-hidden="true" />{text("restore")}</button></article>)}</div> : null}
        </>
      )}
    </section>
  );
}
