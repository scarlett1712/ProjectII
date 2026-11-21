import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";

/** Shared styles for input, select and textarea controls. */
export const controlClasses =
  "w-full rounded-xl border border-line bg-gray-50 px-4 py-3 text-sm font-bold text-ink-strong outline-none transition-colors " +
  "placeholder:text-ink-subtle focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60";

/** Small uppercase field label for use outside Field. */
export function FieldLabel({ htmlFor, children, className }: { htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-subtle", className)}>
      {children}
    </label>
  );
}

interface FieldProps {
  label: ReactNode;
  /** Pass one input. Field assigns its id to associate the label. */
  children: ReactElement<{ id?: string }>;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
}

/** Field label and input with a hint or validation error. */
export function Field({ label, children, hint, error, className }: FieldProps) {
  const generatedId = useId();
  const id = (isValidElement(children) && children.props.id) || generatedId;
  return (
    <div className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {cloneElement(children, { id })}
      {error ? (
        <p className="mt-1 text-xs font-bold text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClasses, "cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, "resize-none", className)} {...props} />;
}
