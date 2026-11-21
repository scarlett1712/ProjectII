/** Join class names and skip empty or false values, as in cn("a", isActive && "b", className). */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
