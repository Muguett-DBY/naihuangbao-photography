import {
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react";
import { BookingContext } from "./BookingContext";

type BookingModalModule = {
  default: typeof import("../../components/BookingModal").BookingModal;
};

let bookingModalModulePromise: Promise<BookingModalModule> | undefined;

function preloadBookingModal() {
  bookingModalModulePromise ??= import("../../components/BookingModal")
    .then(({ BookingModal }) => ({ default: BookingModal }))
    .catch((error: unknown) => {
      bookingModalModulePromise = undefined;
      throw error;
    });

  return bookingModalModulePromise;
}

const BookingModal = lazy(preloadBookingModal);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("");

  const openBookingModal = useCallback((packageName?: string) => {
    setSelectedPackage(packageName ?? "");
    setIsOpen(true);
  }, []);
  const closeBookingModal = useCallback(() => setIsOpen(false), []);
  const warmBookingModal = useCallback(() => {
    void preloadBookingModal().catch(() => undefined);
  }, []);
  const value = useMemo(
    () => ({ openBookingModal, isBookingOpen: isOpen, warmBookingModal }),
    [isOpen, openBookingModal, warmBookingModal],
  );

  return (
    <BookingContext.Provider value={value}>
      {children}
      {isOpen && (
        <Suspense
          fallback={
            <div role="status" aria-live="polite" className="sr-only">
              Loading
            </div>
          }
        >
          <BookingModal
            initialPackage={selectedPackage}
            onClose={closeBookingModal}
          />
        </Suspense>
      )}
    </BookingContext.Provider>
  );
}
