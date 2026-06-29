import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetch } from "../hooks/useFetch";
import { getBusinessDate } from "../utils/businessDate";

type DateInfo = {
  status: "available" | "booked" | "partial";
  count: number;
};

type AvailabilityResponse = {
  dates: Record<string, DateInfo>;
};

type BookingCalendarProps = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  minDate?: string;
};

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function BookingCalendar({ selectedDate, onSelectDate, minDate }: BookingCalendarProps) {
  const { t, i18n } = useTranslation();
  const calendarRef = useRef<HTMLDivElement>(null);
  const effectiveMinDate = useMemo(() => minDate || getBusinessDate(), [minDate]);
  const [minYear, minMonth] = useMemo(() => {
    const [yearText, monthText] = effectiveMinDate.split("-");
    return [Number(yearText), Number(monthText) - 1];
  }, [effectiveMinDate]);
  const [year, setYear] = useState(minYear);
  const [month, setMonth] = useState(minMonth);
  const [focusedDay, setFocusedDay] = useState<number | null>(null);

  const monthKey = formatMonth(year, month);
  const { data, loading } = useFetch<AvailabilityResponse>(`/api/availability?month=${monthKey}`);
  const availability = data?.dates ?? {};

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const canGoPrev = year > minYear || (year === minYear && month > minMonth);

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setFocusedDay(null);
  }, [canGoPrev]);

  const goNext = useCallback(() => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setFocusedDay(null);
  }, []);

  const handleDayClick = useCallback(
    (day: number) => {
      const key = formatDateKey(year, month, day);
      const info = availability[key];
      if (info?.status === "booked") return;
      if (key < effectiveMinDate) return;
      onSelectDate(key);
      setFocusedDay(day);
    },
    [year, month, availability, effectiveMinDate, onSelectDate],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const cal = calendarRef.current;
      if (!cal || !cal.contains(e.target as Node)) return;

      // Month navigation with left/right when no day is focused
      if (focusedDay === null) {
        if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
        if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
        if (e.key === "ArrowDown") { e.preventDefault(); setFocusedDay(1); }
        return;
      }

      // Day navigation
      let newDay = focusedDay;
      if (e.key === "ArrowLeft") { e.preventDefault(); newDay = Math.max(1, focusedDay - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); newDay = Math.min(daysInMonth, focusedDay + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); newDay = Math.max(1, focusedDay - 7); }
      else if (e.key === "ArrowDown") { e.preventDefault(); newDay = Math.min(daysInMonth, focusedDay + 7); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleDayClick(focusedDay); return; }
      else if (e.key === "Escape") { e.preventDefault(); setFocusedDay(null); return; }
      else return;

      setFocusedDay(newDay);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedDay, daysInMonth, goPrev, goNext, handleDayClick]);

  const monthLabel = new Intl.DateTimeFormat(i18n.language, { year: "numeric", month: "long" }).format(new Date(year, month, 1));

  const cells: Array<{ day: number; key: string } | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = formatDateKey(year, month, d);
    cells.push({ day: d, key });
  }

  return (
    <div className="booking-calendar" ref={calendarRef}>
      <div className="calendar-nav">
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={goPrev}
          disabled={!canGoPrev}
          aria-label={t("calendar.prevMonth")}
        >
          ‹
        </button>
        <span className="calendar-nav-title">{monthLabel}</span>
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={goNext}
          aria-label={t("calendar.nextMonth")}
        >
          ›
        </button>
      </div>
      <p className="calendar-date-boundary">
        {t("calendar.earliestBookable", { date: effectiveMinDate })}
      </p>

      <div className="calendar-weekdays">
        {WEEKDAY_KEYS.map((key) => (
          <span key={key} className="calendar-weekday">{t(`calendar.weekdays.${key}` as unknown as never)}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((cell, i) => {
          if (!cell) return <span key={`empty-${i}`} className="calendar-day calendar-day--empty" />;

          const info = availability[cell.key];
          const status = info?.status ?? "available";
          const isBooked = status === "booked";
          const isSelected = cell.key === selectedDate;
          const isPast = cell.key < effectiveMinDate;
          const isDisabled = isBooked || isPast;
          const statusLabel = isPast
            ? t("calendar.unavailableBefore", { date: effectiveMinDate })
            : t(`calendar.${status}`);

          const classNames = [
            "calendar-day",
            `calendar-day--${status}`,
            isSelected && "calendar-day--selected",
            isDisabled && "calendar-day--disabled",
            focusedDay === cell.day && "calendar-day--focused",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={cell.key}
              type="button"
              className={classNames}
              onClick={() => handleDayClick(cell.day)}
              disabled={isDisabled}
              aria-label={`${cell.day}日 - ${statusLabel}`}
            >
              <span className="calendar-day-num">{cell.day}</span>
              {info && (
                <span className={`calendar-day-dot calendar-day-dot--${status}`} />
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="calendar-skeleton" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <span key={i} className="calendar-skeleton-day" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          <div className="calendar-summary" aria-live="polite">
            {(() => {
              const availableCount = Object.values(availability).filter((d) => d.status === "available").length;
              const partialCount = Object.values(availability).filter((d) => d.status === "partial").length;
              const bookedCount = Object.values(availability).filter((d) => d.status === "booked").length;
              return (
                <span>
                  {availableCount > 0 && `${availableCount} ${t("calendar.availableDates", "open")}`}
                  {availableCount > 0 && partialCount > 0 && " · "}
                  {partialCount > 0 && `${partialCount} ${t("calendar.partialDates", "partial")}`}
                  {bookedCount > 0 && ` · ${bookedCount} ${t("calendar.bookedDates", "full")}`}
                </span>
              );
            })()}
          </div>
          <div className="calendar-legend">
        <span className="calendar-legend-item">
          <span className="calendar-day-dot calendar-day-dot--available" />
          {t("calendar.available")}
        </span>
        <span className="calendar-legend-item">
          <span className="calendar-day-dot calendar-day-dot--partial" />
          {t("calendar.partial")}
        </span>
        <span className="calendar-legend-item">
          <span className="calendar-day-dot calendar-day-dot--booked" />
          {t("calendar.booked")}
        </span>
      </div>
      </>
      )}
    </div>
  );
}
