import { useMemo } from "react";
import { useFetch } from "./useFetch";
import { BUSINESS_TIME_ZONE, getBusinessDate } from "../utils/businessDate";

export type BookingPolicy = {
  earliestDate: string;
  timeZone: string;
  capacityPerDay: number;
  dateFormat: string;
  unavailableReasons: {
    beforeEarliest: string;
    fullyBooked: string;
    invalidDate: string;
  };
  generatedAt: string;
};

function isPolicyResponse(value: BookingPolicy | null): value is BookingPolicy {
  return Boolean(
    value
      && /^\d{4}-\d{2}-\d{2}$/.test(value.earliestDate)
      && value.timeZone
      && Number.isFinite(value.capacityPerDay),
  );
}

export function useBookingPolicy() {
  const fallbackPolicy = useMemo<BookingPolicy>(() => ({
    earliestDate: getBusinessDate(),
    timeZone: BUSINESS_TIME_ZONE,
    capacityPerDay: 3,
    dateFormat: "YYYY-MM-DD",
    unavailableReasons: {
      beforeEarliest: "before_earliest",
      fullyBooked: "fully_booked",
      invalidDate: "invalid_date",
    },
    generatedAt: "client-fallback",
  }), []);
  const { data, loading, error, retry } = useFetch<BookingPolicy>("/api/booking/policy");
  const hasPolicy = isPolicyResponse(data);

  return {
    policy: hasPolicy ? data : fallbackPolicy,
    loading,
    error,
    retry,
    usingFallback: !hasPolicy,
  };
}
