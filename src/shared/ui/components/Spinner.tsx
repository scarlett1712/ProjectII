import { Loader2 } from "lucide-react";
import { cn } from "./cn";

interface SpinnerProps {
  /** Defaults to h-4 w-4. Pass alternative size classes in className. */
  className?: string;
  label?: string;
}

/** Spinning loading indicator that inherits the parent's text color. */
export function Spinner({ className, label }: SpinnerProps) {
  return (
    <Loader2
      className={cn("h-4 w-4 animate-spin", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "status" : undefined}
    />
  );
}
