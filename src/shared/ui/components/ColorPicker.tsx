"use client";

import { useTranslations } from "next-intl";
import { boldColors, pastelColors } from "@/shared/theme/palettes";
import { cn } from "./cn";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  /** Defaults to the app's bold and pastel palettes. */
  bold?: readonly string[];
  pastel?: readonly string[];
  /** Allow a custom color through the browser's color picker. Enabled by default. */
  allowCustom?: boolean;
}

function Swatches({
  colors,
  value,
  onChange,
  label,
}: {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
  label: (color: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          style={{ backgroundColor: color }}
          className={cn(
            "h-6 w-6 rounded-full border-2 transition-all",
            value === color ? "scale-110 border-primary shadow-sm" : "border-transparent hover:scale-105",
          )}
          aria-label={label(color)}
          aria-pressed={value === color}
        />
      ))}
    </div>
  );
}

const groupTitle = "mb-1 block text-3xs font-bold uppercase tracking-wider text-ink-subtle";

/** Color picker with bold, pastel and custom colors. */
export function ColorPicker({
  value,
  onChange,
  bold = boldColors,
  pastel = pastelColors,
  allowCustom = true,
}: ColorPickerProps) {
  const tc = useTranslations("common");
  return (
    <div className="space-y-3">
      <div>
        <span className={groupTitle}>{tc("colorPicker.bold")}</span>
        <Swatches colors={bold} value={value} onChange={onChange} label={(color) => tc("colorPicker.pickColor", { color })} />
      </div>
      <div>
        <span className={groupTitle}>{tc("colorPicker.pastel")}</span>
        <Swatches
          colors={pastel}
          value={value}
          onChange={onChange}
          label={(color) => tc("colorPicker.pickPastelColor", { color })}
        />
      </div>
      {allowCustom && (
        <div>
          <span className={groupTitle}>{tc("colorPicker.custom")}</span>
          <div className="flex items-center gap-2">
            <div
              className="group relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-line bg-gradient-to-tr from-red-400 via-green-400 to-blue-400 transition-transform hover:scale-105"
              title={tc("colorPicker.customHint")}
            >
              <input
                type="color"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label={tc("colorPicker.customPalette")}
              />
              <span className="pointer-events-none text-2xs font-black text-white drop-shadow-sm">+</span>
            </div>
            <span className="font-mono text-caption font-bold uppercase text-ink-muted">{value}</span>
            <div className="h-5 w-5 rounded-full border border-line shadow-inner" style={{ backgroundColor: value }} />
          </div>
        </div>
      )}
    </div>
  );
}
