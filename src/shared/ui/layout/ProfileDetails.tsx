"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/shared/config/routes";
import { Button } from "@/shared/ui/components";

/** Message key in the common namespace for each activity level. */
const activityLevelKeys = {
  SEDENTARY: "profile.activitySedentary",
  LIGHT: "profile.activityLight",
  MODERATE: "profile.activityModerate",
  ACTIVE: "profile.activityActive",
  VERY_ACTIVE: "profile.activityVeryActive",
} as const;

export interface ProfileSummary {
  gender?: string | null;
  age?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  activityLevel?: string | null;
}

interface ProfileDetailsProps {
  userName: string;
  profile: ProfileSummary | null;
  onEdit: () => void;
  onClose: () => void;
  onChangePassword: () => void;
  onSignOut: () => void;
}

/** Read-only profile details in the profile modal. */
export function ProfileDetails({ userName, profile, onEdit, onClose, onSignOut }: ProfileDetailsProps) {
  const tShell = useTranslations("shell");
  const tSettings = useTranslations("settings");
  const tc = useTranslations("common");

  const level = profile?.activityLevel;
  const activityLabel = level
    ? level in activityLevelKeys
      ? tc(activityLevelKeys[level as keyof typeof activityLevelKeys])
      : level
    : tc("profile.notSet");
  const genderLabel =
    profile?.gender === "FEMALE"
      ? tc("profile.female")
      : profile?.gender === "MALE"
        ? tc("profile.male")
        : profile?.gender === "OTHER"
          ? tShell("profile.genderOther")
          : tc("profile.notSet");

  const rows = [
    { label: tc("profile.gender"), value: genderLabel },
    {
      label: tc("profile.age"),
      value: profile?.age ? tShell("profile.ageValue", { age: String(profile.age) }) : tc("profile.notSet"),
    },
  ];
  const tiles = [
    {
      label: tc("profile.weight"),
      value: profile?.weightKg ? tShell("profile.weightValue", { kg: String(profile.weightKg) }) : tc("profile.notSet"),
    },
    {
      label: tc("profile.height"),
      value: profile?.heightCm ? tShell("profile.heightValue", { cm: String(profile.heightCm) }) : tc("profile.notSet"),
    },
  ];

  return (
    <>
      <h2 className="mb-1 text-2xl font-bold text-primary">{userName}</h2>
      <p className="mb-8 text-sm text-ink-muted">{tShell("profile.userInfo")}</p>

      <div className="w-full space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-2xl bg-primary-soft px-5 py-3">
            <span className="text-sm font-bold text-ink-muted">{row.label}</span>
            <span className="text-sm font-black text-primary">{row.value}</span>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="flex flex-col items-center justify-center rounded-2xl bg-primary-soft p-3">
              <span className="text-2xs font-bold uppercase text-ink-muted">{tile.label}</span>
              <span className="text-base font-black text-primary">{tile.value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-primary-soft px-5 py-3">
          <span className="text-sm font-bold text-ink-muted">{tShell("profile.activity")}</span>
          <span className="text-sm font-black text-primary">{activityLabel}</span>
        </div>
      </div>

      <div className="mt-8 flex w-full gap-3">
        <Button variant="secondary" size="lg" className="flex-1" onClick={onEdit}>
          {tShell("profile.edit")}
        </Button>
        <Button size="lg" className="flex-1" onClick={onClose}>
          {tc("action.close")}
        </Button>
      </div>

      <div className="mt-4 flex w-full items-center justify-between border-t border-line pt-4">
        <Link
          href={ROUTES.settings}
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-ink-muted hover:bg-surface-muted transition"
        >
          <Settings className="h-3.5 w-3.5 text-primary" />
          {tSettings("menuLabel")}
        </Link>
        <Button variant="ghost" size="sm" icon={<LogOut className="h-3.5 w-3.5" />} onClick={onSignOut}>
          {tShell("sidebar.signOut")}
        </Button>
      </div>
    </>
  );
}
