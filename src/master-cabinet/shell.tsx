"use client";

import type { ReactNode } from "react";
import { OfflineBanner } from "@/components/offline-banner";
import { useOnline } from "@/lib/use-online";
import type { Theme } from "@/theme/theme";
import { BottomBar, bottomBarSpace } from "./bottom-bar";
import { Sidebar } from "./sidebar";

export function MasterShell({
  theme,
  email,
  children,
}: {
  theme: Theme;
  email: string | null;
  children: ReactNode;
}) {
  const online = useOnline();

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <Sidebar theme={theme} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <main
          className={`flex flex-1 flex-col px-4 pt-4 lg:px-8 lg:pt-8 ${bottomBarSpace} ${online ? "" : "opacity-60"}`}
        >
          {children}
        </main>
      </div>
      <BottomBar theme={theme} email={email} />
    </div>
  );
}
