import { ArrowRight, Camera, CornerDownLeft, Layers3, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { primaryNavigation, practiceNavigation } from "../data/product-navigation";
import { archiveProjects } from "../data/living-archive";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { OPEN_COMMAND_PALETTE_EVENT } from "../lib/command-palette";
import { prepareViewTransition } from "../lib/view-transition";
import { track } from "../utils/track";

type PaletteResult = {
  id: string;
  to: string;
  label: string;
  description: string;
  search: string;
  kind: "route" | "archive" | "photo";
};

const focusableSelector = 'input, button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function CommandPalette({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { photos } = usePublicPhotos();
  const [open, setOpen] = useState(initiallyOpen);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const results = useMemo(() => {
    const routes: PaletteResult[] = [...primaryNavigation, ...practiceNavigation].map((route) => ({
      id: route.id,
      to: route.to,
      label: t(route.labelKey as never),
      description: t(route.descriptionKey as never),
      search: `${route.keywords.join(" ")} ${t(route.labelKey as never)} ${t(route.descriptionKey as never)}`.toLowerCase(),
      kind: "route",
    }));
    const photoResults: PaletteResult[] = photos
      .filter((photo) => photo.visibility === "public")
      .map((photo) => ({
        id: photo.id,
        to: `/gallery/${photo.id}`,
        label: photo.title,
        description: `${photo.location} / ${photo.album || photo.style}`,
        search: `${photo.title} ${photo.location} ${photo.album || ""} ${photo.tags?.join(" ") || ""}`.toLowerCase(),
        kind: "photo",
      }));
    const archiveResults: PaletteResult[] = archiveProjects.map((project) => ({
      id: project.id,
      to: `/archive/${project.id}`,
      label: project.title,
      description: `${project.chapter} / ${project.subtitle}`,
      search: `${project.title} ${project.subtitle} ${project.place} ${project.moods.join(" ")} ${project.palette.join(" ")}`.toLowerCase(),
      kind: "archive",
    }));
    const normalized = query.trim().toLowerCase();
    const all = [...routes, ...archiveResults, ...photoResults];
    return normalized ? all.filter((result) => result.search.includes(normalized)).slice(0, 10) : all.slice(0, 10);
  }, [photos, query, t]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.classList.add("command-palette-open");
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.classList.remove("command-palette-open");
      window.removeEventListener("keydown", onEscape);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  const selectResult = (result: PaletteResult) => {
    track("command_palette_select", { id: result.id, kind: result.kind });
    setOpen(false);
    prepareViewTransition(window.location.pathname, result.to);
    navigate(result.to, { viewTransition: true });
  };

  if (!open) return null;

  return createPortal(
    <div className="command-palette-layer">
      <button className="command-palette-backdrop" type="button" aria-label={t("common.close", "Close")} onClick={() => setOpen(false)} />
      <div
        ref={dialogRef}
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) || []);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="command-palette__search">
          <Search size={20} aria-hidden="true" />
          <label id="command-palette-title" className="sr-only" htmlFor="command-palette-input">{t("platform.command.title")}</label>
          <input
            ref={inputRef}
            id="command-palette-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("platform.command.placeholder")}
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && results[activeIndex]) {
                event.preventDefault();
                selectResult(results[activeIndex]);
              }
            }}
          />
          <button type="button" className="command-palette__close" onClick={() => setOpen(false)} aria-label={t("common.close", "Close")}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="command-palette__meta">
          <span>{query ? t("platform.command.results") : t("platform.command.suggestions")}</span>
          <kbd>ESC</kbd>
        </div>

        <div className="command-palette__results" role="listbox" aria-label={t("platform.command.results")}>
          {results.length ? results.map((result, index) => (
            <button
              key={`${result.kind}-${result.id}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className={activeIndex === index ? "is-active" : ""}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => selectResult(result)}
            >
              <span className="command-palette__result-icon" aria-hidden="true">
                {result.kind === "photo" ? <Camera size={17} /> : result.kind === "archive" ? <Layers3 size={17} /> : <ArrowRight size={17} />}
              </span>
              <span>
                <strong>{result.label}</strong>
                <small>{result.description}</small>
              </span>
              <CornerDownLeft size={16} aria-hidden="true" />
            </button>
          )) : (
            <p className="command-palette__empty">{t("platform.command.empty")}</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
