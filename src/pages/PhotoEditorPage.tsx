import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";

export default function PhotoEditorPage() {
  const { t } = useTranslation();
  useSEO({ titleKey: "editor.title", descKey: "editor.desc", path: "/editor" });

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const [hasImage, setHasImage] = useState(false);
  const [fileName, setFileName] = useState("");
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    import("tui-image-editor").then((mod) => {
      if (!mounted || !containerRef.current) return;
      const ImageEditor = mod.default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts: any = {
        includeUI: {
          loadImage: { path: "", name: "" },
          menu: ["crop", "flip", "rotate", "draw", "shape", "icon", "text", "filter"],
          initMenu: "filter",
          uiSize: { width: "100%", height: "calc(100vh - 200px)" },
          menuBarPosition: "bottom",
        },
        cssMaxHeight: window.innerHeight - 200,
        cssMaxWidth: window.innerWidth - 40,
        usageStatistics: false,
      };
      editorRef.current = new ImageEditor(containerRef.current, opts);
      setEditorReady(true);
    });
    return () => { mounted = false; };
  }, []);

  const handleFileUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        editorRef.current?.loadImageFromURL(reader.result as string, file.name);
        setHasImage(true);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  const handleDownload = useCallback(() => {
    if (!editorRef.current) return;
    const dataURL = editorRef.current.toDataURL();
    const link = document.createElement("a");
    link.download = fileName ? `edited-${fileName}` : "edited-photo.png";
    link.href = dataURL;
    link.click();
  }, [fileName]);

  return (
    <PageTransition>
      <div className="editor-root">
        <header className="editor-header">
          <h1>{t("editor.title")}</h1>
          <p>{t("editor.subtitle")}</p>
        </header>

        <div className="editor-toolbar">
          <button type="button" className="editor-btn editor-btn--primary" onClick={handleFileUpload}>
            {t("editor.upload")}
          </button>
          {hasImage && (
            <button type="button" className="editor-btn editor-btn--primary" onClick={handleDownload}>
              {t("editor.download")}
            </button>
          )}
        </div>

        <div className="editor-canvas-wrap">
          {editorReady ? null : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--caramel-muted)" }}>
              {t("common.loading")}
            </div>
          )}
          <div ref={containerRef} style={{ display: editorReady ? "block" : "none" }} />
        </div>
      </div>
    </PageTransition>
  );
}
