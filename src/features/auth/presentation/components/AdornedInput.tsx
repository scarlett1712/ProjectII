import type { InputHTMLAttributes, ReactNode } from "react";
import { TextInput, cn } from "@/shared/ui/components";

interface AdornedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Decorative icon to the left of the input. */
  leading?: ReactNode;
  /** Element to the right of the input, such as the password visibility button. */
  trailing?: ReactNode;
}

/**
 * TextInput with icons on both sides. The input itself receives the id so Field can associate its label.
 */
export function AdornedInput({ leading, trailing, className, ...props }: AdornedInputProps) {
  return (
    <div className="relative">
      {leading && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary">{leading}</span>
      )}
      <TextInput className={cn(leading ? "pl-10" : undefined, trailing ? "pr-10" : undefined, className)} {...props} />
      {trailing && <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>}
    </div>
  );
}
