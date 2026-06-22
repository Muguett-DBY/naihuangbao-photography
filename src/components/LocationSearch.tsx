import { useState } from "react";
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

  const filteredLocations = query
    ? locations.filter((loc) =>
        loc.toLowerCase().includes(query.toLowerCase())
      )
    : locations;

  const handleSelect = (location: string) => {
    setQuery(location);
    setIsOpen(false);
    onLocationSelect(location);
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    onLocationSelect(null);
  };

  return (
    <div className="location-search">
      <div className="location-search-input-wrap">
        <Search size={16} className="location-search-icon" />
        <input
          type="text"
          className="location-search-input"
          placeholder={t("map.searchPlaceholder", "Search locations...")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {query && (
          <button
            type="button"
            className="location-search-clear"
            onClick={handleClear}
            aria-label={t("map.clearSearch", "Clear search")}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && filteredLocations.length > 0 && (
        <ul className="location-search-list" role="listbox">
          {filteredLocations.slice(0, 10).map((loc) => (
            <li
              key={loc}
              className="location-search-item"
              onClick={() => handleSelect(loc)}
              role="option"
              tabIndex={0}
            >
              {loc}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
