import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetch } from "../hooks/useFetch";

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
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const monthKey = formatMonth(year, month);
  const { data, loading } = useFetch<AvailabilityResponse>(`/api/availability?month=${monthKey}`);
  const availability = data?.dates ?? {};

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const canGoPrev = !(year === today.getFullYear() && month === today.getMonth());

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, [canGoPrev]);

  const goNext = useCallback(() => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handleDayClick = useCallback(
    (day: number) => {
      const key = formatDateKey(year, month, day);
      const info = availability[key];
      if (info?.status === "booked") return;
      if (minDate && key < minDate) return;
      onSelectDate(key);
    },
    [year, month, availability, minDate, onSelectDate],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const cal = calendarRef.current;
      if (!cal || !cal.contains(e.target as Node)) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goPrev, goNext]);

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
          const isPast = minDate ? cell.key < minDate : cell.key < today.toISOString().slice(0, 10);
          const isDisabled = isBooked || isPast;

          const classNames = [
            "calendar-day",
            `calendar-day--${status}`,
            isSelected && "calendar-day--selected",
            isDisabled && "calendar-day--disabled",
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
              aria-label={`${cell.day}日 - ${t(`calendar.${status}`)}`}
            >
              <span className="calendar-day-num">{cell.day}</span>
              {info && (
                <span className={`calendar-day-dot calendar-day-dot--${status}`} />
              )}
            </button>
          );
        })}
      </div>

      {loading && <p className="calendar-loading">{t("common.loading")}</p>}

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
    </div>
  );
}
