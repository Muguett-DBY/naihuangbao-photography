import { useCallback, useRef, useState } from "react";
import ImageEditor from "@toast-ui/react-image-editor";
import { useTranslation } from "react-i18next";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";

const editorTheme = {
  "common.bi.image": "",
  "common.bisize.width": "0",
  "common.bisize.height": "0",
  "common.backgroundImage": "none",
  "common.backgroundColor": "#fef3dd",
  "common.border": "1px solid rgba(139, 94, 74, 0.15)",
  "common.borderRadius": "16px",
  "common.buttonColor": "#8B5E4A",
  "common.buttonBackgroundColor": "#FFB8A1",
  "common.buttonBorderColor": "rgba(139, 94, 74, 0.2)",
  "common.buttonBorderRadius": "999px",
  "common.buttonFontSize": "13px",
  "common.buttonFontWeight": "600",
  "common.buttonFontFamily": "var(--font-ui)",
  "_submenu.backgroundColor": "#FFFDF7",
  "submenu.borderColor": "rgba(139, 94, 74, 0.1)",
  "submenu.fontSize": "12px",
  "submenu.fontColor": "#8B5E4A",
  "submenu.label.color": "#8B5E4A",
  "submenu.activeLabel.color": "#FFB8A1",
  "range.pointer.color": "#FFB8A1",
  "range.pointer.borderColor": "#8B5E4A",
  "range.bar.color": "rgba(139, 94, 74, 0.15)",
  "range.subbar.color": "#FFB8A1",
  "range.input.color": "#8B5E4A",
  "range.input.borderColor": "rgba(139, 94, 74, 0.2)",
  "range.input.borderRadius": "8px",
  "colorpicker.button.color": "#8B5E4A",
  "colorpicker.input.color": "#8B5E4A",
};

export default function PhotoEditorPage() {
  const { t } = useTranslation();
  useSEO({ titleKey: "editor.title", descKey: "editor.desc", path: "/editor" });

  const editorRef = useRef<InstanceType<typeof ImageEditor>>(null);
  const [hasImage, setHasImage] = useState(false);
  const [fileName, setFileName] = useState("");

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
        const editor = editorRef.current?.getInstance();
        if (editor) {
          editor.loadImageFromURL(reader.result as string, file.name);
          setHasImage(true);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  const handleDownload = useCallback(() => {
    const editor = editorRef.current?.getInstance();
    if (!editor) return;
    const dataURL = editor.toDataURL();
    const link = document.createElement("a");
    link.download = fileName ? `edited-${fileName}` : "edited-photo.png";
    link.href = dataURL;
    link.click();
  }, [fileName]);

  const handleUndo = useCallback(() => {
    editorRef.current?.getInstance().undo();
  }, []);

  const handleRedo = useCallback(() => {
    editorRef.current?.getInstance().redo();
  }, []);

  const handleReset = useCallback(() => {
    editorRef.current?.getInstance().reset();
  }, []);

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
            <>
              <button type="button" className="editor-btn" onClick={handleUndo} title={t("editor.undo")}>
                ↩
              </button>
              <button type="button" className="editor-btn" onClick={handleRedo} title={t("editor.redo")}>
                ↪
              </button>
              <button type="button" className="editor-btn" onClick={handleReset} title={t("editor.reset")}>
                ⟲
              </button>
              <button type="button" className="editor-btn editor-btn--primary" onClick={handleDownload}>
                {t("editor.download")}
              </button>
            </>
          )}
        </div>

        <div className="editor-canvas-wrap">
          <ImageEditor
            ref={editorRef}
            includeUI={{
              loadImage: {
                path: "",
                name: "",
              },
              theme: editorTheme,
              menu: [
                "crop",
                "flip",
                "rotate",
                "draw",
                "shape",
                "icon",
                "text",
                "filter",
              ],
              initMenu: "filter",
              uiSize: {
                width: "100%",
                height: "calc(100vh - 200px)",
              },
              menuBarPosition: "bottom",
            }}
            cssMaxHeight={typeof window !== "undefined" ? window.innerHeight - 200 : 600}
            cssMaxWidth={typeof window !== "undefined" ? window.innerWidth - 40 : 800}
            usageStatistics={false}
          />
        </div>
      </div>
    </PageTransition>
  );
}
