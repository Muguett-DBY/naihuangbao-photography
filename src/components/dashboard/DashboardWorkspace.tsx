import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";

export type DashboardWorkspaceItem = {
  key: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
};

type DashboardWorkspaceProps = {
  items: DashboardWorkspaceItem[];
  ariaLabel: string;
  defaultActiveKey?: string;
};

export function DashboardWorkspace({
  items,
  ariaLabel,
  defaultActiveKey,
}: DashboardWorkspaceProps) {
  const [activeKey, setActiveKey] = useState(defaultActiveKey ?? items[0]?.key ?? "");
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches,
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeItem = items.find((item) => item.key === activeKey) ?? items[0];

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const updateOrientation = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(query.matches);
    query.addEventListener("change", updateOrientation);
    return () => query.removeEventListener("change", updateOrientation);
  }, []);

  const activateAt = (index: number) => {
    const item = items[index];
    if (!item) return;
    setActiveKey(item.key);
    requestAnimationFrame(() => tabRefs.current[index]?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % items.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + items.length) % items.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = items.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    activateAt(nextIndex);
  };

  if (!activeItem) return null;

  return (
    <div className="dashboard-workspace">
      <nav className="dashboard-workspace-nav" aria-label={ariaLabel}>
        <div
          className="dashboard-workspace-tablist"
          role="tablist"
          aria-orientation={isMobile ? "horizontal" : "vertical"}
        >
          {items.map((item, index) => {
            const active = item.key === activeItem.key;
            const tabId = `dashboard-tab-${item.key}`;
            const panelId = `dashboard-panel-${item.key}`;
            return (
              <button
                key={item.key}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                id={tabId}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={panelId}
                tabIndex={active ? 0 : -1}
                className={`dashboard-workspace-tab${active ? " is-active" : ""}`}
                onClick={() => setActiveKey(item.key)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                <span className="dashboard-workspace-tab-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <section
        id={`dashboard-panel-${activeItem.key}`}
        className="dashboard-workspace-panel"
        role="tabpanel"
        aria-labelledby={`dashboard-tab-${activeItem.key}`}
        tabIndex={0}
      >
        {activeItem.content}
      </section>
    </div>
  );
}
