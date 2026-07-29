import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { BookingModal } from "../components/BookingModal";

type BookingContextValue = {
  openBookingModal: (packageName?: string) => void;
  isBookingOpen: boolean;
};

const BookingContext = createContext<BookingContextValue>({
  openBookingModal: () => {},
  isBookingOpen: false,
});

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState("");

  const openBookingModal = useCallback((packageName?: string) => {
    setSelectedPkg(packageName ?? "");
    setIsOpen(true);
  }, []);
  const closeBookingModal = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ openBookingModal, isBookingOpen: isOpen }),
    [isOpen, openBookingModal],
  );
  return (
    <BookingContext.Provider value={value}>
      {children}
      {isOpen && (
        <BookingModal
          initialPackage={selectedPkg}
          onClose={closeBookingModal}
        />
      )}
    </BookingContext.Provider>
  );
}

export function useBookingModal() {
  return useContext(BookingContext);
}
