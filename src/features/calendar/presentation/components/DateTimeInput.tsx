import type { InputHTMLAttributes } from "react";
import { TextInput } from "@/shared/ui/components";

/** Disable native iOS Safari styling to keep the date input within the modal. */
const noOverflowStyle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  WebkitAppearance: "none",
  appearance: "none",
} as const;

/** Local date-time input sized to fit on iOS Safari. */
export function DateTimeInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <TextInput {...props} type="datetime-local" className="block min-w-0 max-w-full box-border" style={noOverflowStyle} />
  );
}
