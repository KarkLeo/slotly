import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/session";
import { BookingCard } from "@/client-cabinet/booking-card";
import { loadMyBooking } from "@/client-cabinet/load";
import { toBookingView } from "@/client-cabinet/view";

export default async function MyBookingPage({
  params,
}: PageProps<"/app/bookings/[id]">) {
  await requireUser();
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const booking = await loadMyBooking(id);
  if (!booking) notFound();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <BookingCard booking={toBookingView(booking, locale, new Date())} />
    </div>
  );
}
