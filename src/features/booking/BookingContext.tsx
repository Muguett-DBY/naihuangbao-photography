import { createContext, useContext } from "react";

export type BookingContextValue = {
  openBookingModal: (packageName?: string) => void;
  isBookingOpen: boolean;
  warmBookingModal: () => void;
};

export const BookingContext = createContext<BookingContextValue>({
  openBookingModal: () => {},
  isBookingOpen: false,
  warmBookingModal: () => {},
});

export function useBookingModal() {
  return useContext(BookingContext);
}
