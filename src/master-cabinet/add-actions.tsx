import { useTranslations } from "next-intl";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { newBlockHref, newBookingHref } from "./sections";

export function AddBookingLink() {
  const t = useTranslations("MasterCabinet.add");

  return (
    <Link href={newBookingHref} className={buttonVariants()}>
      {t("booking")}
    </Link>
  );
}

export function AddActions() {
  const t = useTranslations("MasterCabinet.add");

  return (
    <>
      <Link
        href={newBlockHref}
        className={buttonVariants({ variant: "outline" })}
      >
        {t("block")}
      </Link>
      <AddBookingLink />
    </>
  );
}
