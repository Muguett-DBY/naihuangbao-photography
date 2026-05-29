import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { BookingModal } from "../components/BookingModal";

type BookingContextValue = {
  openBookingModal: (packageName?: string) => void;
};

const BookingContext = createContext<BookingContextValue>({
  openBookingModal: () => {},
});

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState("");

  const openBookingModal = useCallback((packageName?: string) => {
    setSelectedPkg(packageName ?? "");
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ openBookingModal }), [openBookingModal]);
  return (
    <BookingContext.Provider value={value}>
      {children}
      {isOpen && (
        <BookingModal
          initialPackage={selectedPkg}
          onClose={() => setIsOpen(false)}
        />
      )}
    </BookingContext.Provider>
  );
}

export function useBookingModal() {
  return useContext(BookingContext);
}
