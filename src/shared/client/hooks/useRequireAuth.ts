"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROUTES } from "@/shared/config/routes";

/** Load the session and redirect unauthenticated users to sign-in. */
export function useRequireAuth() {
  const router = useRouter();
  const session = useSession();
  useEffect(() => {
    if (session.status === "unauthenticated") router.push(ROUTES.login);
  }, [session.status, router]);
  return session;
}
