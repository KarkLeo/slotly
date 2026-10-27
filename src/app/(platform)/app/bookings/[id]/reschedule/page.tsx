import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/auth/session";
import { loadMyBooking } from "@/client-cabinet/load";
import { RescheduleScreen } from "@/client-cabinet/reschedule-screen";
import { bookingPath, toBookingView } from "@/client-cabinet/view";

export default async function RescheduleBookingPage({
  params,
}: PageProps<"/app/bookings/[id]/reschedule">) {
  await requireUser();
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const booking = await loadMyBooking(id);
  if (!booking) notFound();
  const view = toBookingView(booking, locale, new Date());
  if (!view.canReschedule) redirect(bookingPath(id));

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <RescheduleScreen booking={view} />
    </div>
  );
}
