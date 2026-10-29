import {
  BotIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  Clock3Icon,
  PanelsTopLeftIcon,
  ScissorsIcon,
  SettingsIcon,
  SunIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export type SectionKey =
  | "today"
  | "calendar"
  | "clients"
  | "appointments"
  | "services"
  | "schedule"
  | "landing"
  | "agents"
  | "settings";

export type Section = {
  key: SectionKey;
  href: string;
  icon: LucideIcon;
  place: "bar" | "more";
};

export const sections: readonly Section[] = [
  { key: "today", href: "/app", icon: SunIcon, place: "bar" },
  {
    key: "calendar",
    href: "/app/calendar",
    icon: CalendarDaysIcon,
    place: "bar",
  },
  { key: "clients", href: "/app/clients", icon: UsersIcon, place: "bar" },
  {
    key: "appointments",
    href: "/app/appointments",
    icon: ClipboardListIcon,
    place: "more",
  },
  { key: "services", href: "/app/services", icon: ScissorsIcon, place: "more" },
  { key: "schedule", href: "/app/schedule", icon: Clock3Icon, place: "more" },
  {
    key: "landing",
    href: "/app/landing",
    icon: PanelsTopLeftIcon,
    place: "more",
  },
  { key: "agents", href: "/app/agents", icon: BotIcon, place: "more" },
  { key: "settings", href: "/app/settings", icon: SettingsIcon, place: "more" },
];

export const newBookingHref = "/app/appointments/new";
export const newBlockHref = "/app/blocks/new";

export function activeSection(pathname: string): SectionKey | null {
  if (pathname === "/app") return "today";
  const found = sections.find(
    (s) =>
      s.href !== "/app" &&
      (pathname === s.href || pathname.startsWith(`${s.href}/`)),
  );
  return found?.key ?? null;
}

export function isMoreActive(pathname: string): boolean {
  const key = activeSection(pathname);
  return sections.some((s) => s.key === key && s.place === "more");
}
