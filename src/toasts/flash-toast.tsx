"use client";

import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { decodeFlash, flashCookie } from "./toast";

function takeFlashCookie() {
  const prefix = `${flashCookie}=`;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix));
  if (!cookie) return null;
  document.cookie = `${flashCookie}=; path=/; max-age=0`;
  return decodeFlash(decodeURIComponent(cookie.slice(prefix.length)));
}

export function FlashToast() {
  const t = useTranslations("Toasts");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const flash = takeFlashCookie();
    if (flash) toast[flash.type](t(flash.key));
  }, [pathname, searchParams, t]);

  return null;
}
