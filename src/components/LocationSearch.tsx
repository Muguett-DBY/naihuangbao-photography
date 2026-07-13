import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";

type LocationSearchProps = {
  locations: string[];
  onLocationSelect: (location: string | null) => void;
};

export function LocationSearch({ locations, onLocationSelect }: LocationSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredLocations = useMemo(() => (
    query
      ? locations.filter((loc) => loc.toLowerCase().includes(query.toLowerCase()))
      : locations
  ), [locations, query]);
  const visibleLocations = filteredLocations.slice(0, 10);

  const handleSelect = (location: string) => {
    setQuery(location);
    setIsOpen(false);
    setActiveIndex(-1);
    onLocationSelect(location);
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    onLocationSelect(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (
        visibleLocations.length > 0 ? Math.min(current + 1, visibleLocations.length - 1) : -1
      ));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (
        visibleLocations.length === 0
          ? -1
          : current <= 0 ? visibleLocations.length - 1 : current - 1
      ));
      return;
    }
    if (event.key === "Enter" && isOpen && activeIndex >= 0) {
      event.preventDefault();
      const location = visibleLocations[activeIndex];
      if (location) handleSelect(location);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div
      className="location-search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label htmlFor="location-search-input" className="location-search-label">
        {t("photoMap.searchLabel")}
      </label>
      <div className="location-search-input-wrap">
        <Search size={16} className="location-search-icon" aria-hidden="true" />
        <input
          id="location-search-input"
          type="text"
          className="location-search-input"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="location-search-listbox"
          aria-activedescendant={activeIndex >= 0 && visibleLocations[activeIndex]
            ? `location-search-option-${activeIndex}`
            : undefined}
          placeholder={t("photoMap.searchPlaceholder")}
          value={query}
          onChange={(e) => {
            const nextQuery = e.target.value;
            const hasMatches = locations.some((location) => (
              location.toLowerCase().includes(nextQuery.toLowerCase())
            ));
            setQuery(nextQuery);
            setIsOpen(true);
            setActiveIndex(hasMatches ? 0 : -1);
          }}
          onFocus={() => {
            setIsOpen(true);
            setActiveIndex(visibleLocations.length > 0 ? 0 : -1);
          }}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            className="location-search-clear"
            onClick={handleClear}
            aria-label={t("photoMap.clearSearch")}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {isOpen && visibleLocations.length > 0 && (
        <div id="location-search-listbox" className="location-search-list" role="listbox">
          {visibleLocations.map((loc, index) => (
            <button
              type="button"
              key={loc}
              id={`location-search-option-${index}`}
              className={`location-search-item${activeIndex === index ? " is-active" : ""}`}
              onClick={() => handleSelect(loc)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              aria-selected={query === loc}
            >
              {loc}
            </button>
          ))}
        </div>
      )}
      {isOpen && query && visibleLocations.length === 0 && (
        <p className="location-search-empty" role="status">
          {t("photoMap.noSearchResults")}
        </p>
      )}
    </div>
  );
}
