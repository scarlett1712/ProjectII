import type { ReactNode } from "react";

interface AuthCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Circular icon above the heading, such as an emoji. */
  icon?: ReactNode;
  children: ReactNode;
}

/** Centered white card shared by the sign-in, registration and password-reset screens. */
export function AuthCard({ title, subtitle, icon, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-[420px] rounded-panel bg-white p-8 shadow-card">
        <div className="mb-7 text-center">
          {icon && (
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-2xl shadow-inner">
              {icon}
            </div>
          )}
          <h1 className="mb-1 text-3xl font-bold text-primary">{title}</h1>
          {subtitle && <p className="text-sm text-ink-subtle">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
