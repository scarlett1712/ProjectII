import type { ReactNode } from "react";
import { cn } from "@/shared/ui/components";

type AuthNoticeTone = "success" | "warning" | "error";

const toneClasses: Record<AuthNoticeTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-danger",
};

/** Short status message in the authentication card for registration, session expiry or errors. */
export function AuthNotice({ tone, children }: { tone: AuthNoticeTone; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : undefined} className={cn("mb-4 rounded-xl border px-3 py-2 text-sm font-medium", toneClasses[tone])}>
      {children}
    </div>
  );
}
