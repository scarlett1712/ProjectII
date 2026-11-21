import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { clearCache } from "@/shared/client/cacheSync";
import { API_ROUTES, ROUTES, withQuery } from "@/shared/config/routes";

export function useSessionGuard() {
  const handleSignOut = (callbackUrl: string = ROUTES.login) => {
    clearCache();
    signOut({ callbackUrl });
  };

  // Automatically check session validity on focus / tab switch
  // If password changed on another device or session revoked, signOut immediately
  useEffect(() => {
    const checkSessionValidity = async () => {
      try {
        const res = await fetch(API_ROUTES.auth.session);
        if (res.ok) {
          const sess = await res.json();
          // If empty object or no user id returned, session has been revoked!
          if (!sess || !sess.user?.id) {
            handleSignOut(withQuery(ROUTES.login, { revoked: 1 }));
          }
        }
      } catch (err) {
        console.error("Session check error:", err);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSessionValidity();
      }
    };

    window.addEventListener("focus", checkSessionValidity);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", checkSessionValidity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
  return handleSignOut;
}
