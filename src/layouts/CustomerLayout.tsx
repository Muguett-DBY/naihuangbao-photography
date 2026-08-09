import { Outlet } from "react-router";
import OfflineBookingRecovery from "../components/OfflineBookingRecovery";
import { BookingProvider } from "../features/booking/BookingProvider";
import { useBookingModal } from "../features/booking/BookingContext";
import { useExperiencePause } from "../experience/useExperiencePause";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { PublicPhotosProvider } from "../hooks/usePublicPhotos";

function CustomerServices({ isOnline }: { isOnline: boolean }) {
  const { isBookingOpen } = useBookingModal();
  useExperiencePause("booking", isBookingOpen);

  return <OfflineBookingRecovery isOnline={isOnline} />;
}

export function CustomerLayout() {
  const isOnline = useOnlineStatus();

  return (
    <BookingProvider>
      <PublicPhotosProvider>
        <CustomerServices isOnline={isOnline} />
        <Outlet />
      </PublicPhotosProvider>
    </BookingProvider>
  );
}
