import type { Locale } from "@/i18n/locales";
import type { MyBooking } from "./booking";
import { type BookingView, toBookingView } from "./view";

const hour = 3_600_000;

// Whole hours from now, so the stories show the same states whenever they run.
function fromNow(hours: number): string {
  const instant = new Date(Date.now() + hours * hour);
  instant.setUTCMinutes(0, 0, 0);
  return instant.toISOString();
}

function booking(
  id: string,
  startsIn: number,
  changes: Partial<MyBooking> = {},
): MyBooking {
  return {
    id,
    status: "confirmed",
    startsAt: fromNow(startsIn),
    endsAt: fromNow(startsIn + 1.5),
    holdUntil: null,
    changeUntil: fromNow(startsIn - 12),
    canReschedule: true,
    master: {
      name: "Олена Мельник",
      slug: "olena-nails",
      timeZone: "Europe/Kyiv",
      autoConfirm: true,
      horizonDays: 30,
      primaryLocale: "uk",
    },
    service: {
      id: "gel",
      name: { uk: "Манікюр з покриттям", en: "Gel manicure" },
      durationMinutes: 90,
      priceKind: "fixed",
      price: 900,
      currency: "UAH",
      format: "on_site",
    },
    address: null,
    ...changes,
  };
}

const daryna: Partial<MyBooking> = {
  master: {
    name: "Дарина Коваль",
    slug: "daryna",
    timeZone: "Europe/Kyiv",
    autoConfirm: false,
    horizonDays: 30,
    primaryLocale: "uk",
  },
  service: {
    id: "cut",
    name: { uk: "Стрижка", ru: "Стрижка", en: "Haircut" },
    durationMinutes: 60,
    priceKind: "from",
    price: 650,
    currency: "UAH",
    format: "at_client",
  },
};

export const stories = {
  confirmed: booking("b1", 50),
  awaitingMaster: booking("b2", 170, {
    ...daryna,
    status: "pending",
    endsAt: fromNow(171),
    holdUntil: fromNow(20),
    address: "вул. Січових Стрільців, 12, кв. 4",
  }),
  late: booking("b3", 5, {
    service: { ...booking("b3", 5).service, name: { uk: "Корекція нігтів" } },
  }),
  archivedService: booking("b4", 80, { canReschedule: false }),
  completed: booking("b5", -480, { status: "completed" }),
  cancelled: booking("b6", -1300, { ...daryna, status: "cancelled" }),
};

export function view(booking: MyBooking, locale: Locale): BookingView {
  return toBookingView(booking, locale, new Date());
}
