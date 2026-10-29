import { getLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { splitBookings } from "@/client-cabinet/booking";
import { BookingsList } from "@/client-cabinet/bookings-list";
import { CabinetHeader } from "@/client-cabinet/cabinet-header";
import { isMaster, loadMyBookings } from "@/client-cabinet/load";
import { toBookingView } from "@/client-cabinet/view";
import { getTheme } from "@/theme/server";

export default async function MyBookingsPage({
  searchParams,
}: PageProps<"/app/bookings">) {
  const user = await requireUser();
  const [{ tab }, locale, theme, bookings, master] = await Promise.all([
    searchParams,
    getLocale(),
    getTheme(),
    loadMyBookings(),
    isMaster(user.id),
  ]);
  const now = new Date();
  const current = tab === "history" ? "history" : "upcoming";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <CabinetHeader theme={theme} isMaster={master} />
      <BookingsList
        tab={current}
        bookings={splitBookings(bookings, now)[current].map((booking) =>
          toBookingView(booking, locale, now),
        )}
      />
    </div>
  );
}
