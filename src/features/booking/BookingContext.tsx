import { createContext, useContext } from "react";

export type BookingContextValue = {
  openBookingModal: (packageName?: string) => void;
  isBookingOpen: boolean;
};

export const BookingContext = createContext<BookingContextValue>({
  openBookingModal: () => {},
  isBookingOpen: false,
});

export function useBookingModal() {
  return useContext(BookingContext);
}
