"use client";

import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { flashCookie, readFlashCookie } from "./toast";

function takeFlashCookie() {
  if (!document.cookie.includes(`${flashCookie}=`)) return null;
  const flash = readFlashCookie(document.cookie);
  document.cookie = `${flashCookie}=; path=/; max-age=0`;
  return flash;
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
