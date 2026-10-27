import { getLocale } from "next-intl/server";
import { getCurrentUser } from "@/auth/session";
import { calendarFile } from "@/client-cabinet/ics";
import { loadMyBooking } from "@/client-cabinet/load";
import { bookingPath } from "@/client-cabinet/view";
import { localize } from "@/landing/localize";
import { siteUrl } from "@/lib/site-url";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/app/bookings/[id]/calendar">,
) {
  if (!(await getCurrentUser())) return new Response(null, { status: 401 });
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const booking = await loadMyBooking(id);
  if (!booking) return new Response(null, { status: 404 });

  const service = localize(
    booking.service.name,
    locale,
    booking.master.primaryLocale,
  );
  const file = calendarFile(
    {
      id: booking.id,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      title: `${service} · ${booking.master.name}`,
      location: booking.address,
      url: `${siteUrl()}${bookingPath(booking.id)}`,
    },
    new Date(),
  );
  return new Response(file, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="slotly-booking.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
