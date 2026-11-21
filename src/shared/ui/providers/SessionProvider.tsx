"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { setCacheScope } from "@/shared/client/cacheSync";

/** Clear cached data when the signed-in account changes. Mount before children so this runs before screen effects. */
function CacheScopeGuard() {
  const { data, status } = useSession();
  const userId = data?.user?.id ?? null;
  useEffect(() => {
    if (status !== "loading") setCacheScope(userId);
  }, [status, userId]);
  return null;
}

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CacheScopeGuard />
      {children}
    </SessionProvider>
  );
}
