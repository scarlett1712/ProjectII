import { getTagStyles } from "@/shared/theme/tagStyles";
import { cn } from "@/shared/ui/components";

interface TagPillProps {
  name: string;
  /** Label background color. Text and border colors depend on its brightness. */
  color: string;
  /** Use md for main lists and tables and sm for the transaction history table. */
  size?: "sm" | "md";
  className?: string;
}

/** Rounded label in the account or category color. */
export function TagPill({ name, color, size = "md", className }: TagPillProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 font-sans font-bold",
        size === "sm" ? "text-2xs" : "text-xs",
        className,
      )}
      style={getTagStyles(color)}
    >
      {name}
    </span>
  );
}
