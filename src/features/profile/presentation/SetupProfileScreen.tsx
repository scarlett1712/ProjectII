"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useRequireAuth } from "@/shared/client/hooks";
import { restartOnboarding } from "@/shared/client/onboarding";
import { StarBackground } from "@/shared/ui/StarBackground";
import { DraggableStar } from "@/shared/ui/mascot/DraggableStar";
import { useTranslations } from "next-intl";
import { Button, Field, FieldLabel, Select, Spinner, TextInput, useToast } from "@/shared/ui/components";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { API_ROUTES, ROUTES } from "@/shared/config/routes";

export default function SetupProfileScreen() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const toast = useToast();
  const router = useRouter();
  const { data: session, status } = useRequireAuth();
  const userEmail = session?.user?.email || "";

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Enable tours on every page when a newly registered user reaches setup.
    if (userEmail) restartOnboarding(userEmail);
  }, [userEmail]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-soft">
        <div className="text-center animate-pulse">
          <Spinner className="mx-auto h-12 w-12 text-primary" />
          <p className="mt-4 text-primary font-black">{tc("action.loading")}</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest(API_ROUTES.profile, {
        method: "POST",
        body: {
          name: name.trim() || tc("app.defaultUserName"),
          gender: gender || null,
          age: age === "" ? null : Number(age),
          heightCm: height === "" ? null : Number(height),
          weightKg: weight === "" ? null : Number(weight),
          activityLevel: activity || null,
        },
      });
      // Advance to the next step only after saving successfully.
      router.push(ROUTES.setup.notifications);
    } catch (err) {
      toast.error(apiErrorMessage(err, t("setup.saveFailed")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <StarBackground>
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-[480px] rounded-panel bg-white p-8 shadow-card">
          <h1 className="mb-1 text-center text-3xl font-bold text-primary">{t("setup.title")}</h1>
          <p className="mb-6 text-center text-sm leading-relaxed text-ink-subtle">
            {t("setup.introGreeting")}<br />
            {t("setup.introPrefix")}<span className="font-semibold text-primary">{t("setup.introName")}</span>{t("setup.introSuffix")}<br />
            {t("setup.introLine3")}<br />
            <em>{t("setup.introQuestion")}</em>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t("setup.nameLabel")}>
              <TextInput type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={tc("app.defaultUserName")} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label={tc("profile.gender")}>
                <Select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="" disabled>{t("setup.genderPlaceholder")}</option>
                  <option value="FEMALE">{tc("profile.female")}</option>
                  <option value="MALE">{tc("profile.male")}</option>
                  <option value="OTHER">{t("setup.otherGender")}</option>
                </Select>
              </Field>
              <Field label={tc("profile.age")}>
                <TextInput type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder={t("setup.agePlaceholder")} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="height">{tc("profile.height")}</FieldLabel>
                <div className="relative">
                  <TextInput id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                    placeholder={t("setup.heightPlaceholder")} className="pr-12" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-ink-subtle">{t("setup.heightUnit")}</span>
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="weight">{tc("profile.weight")}</FieldLabel>
                <div className="relative">
                  <TextInput id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                    placeholder={t("setup.weightPlaceholder")} className="pr-12" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-ink-subtle">{t("setup.weightUnit")}</span>
                </div>
              </div>
            </div>

            <Field label={tc("profile.activityLevel")}>
              <Select value={activity} onChange={(e) => setActivity(e.target.value)}>
                <option value="" disabled>{t("setup.activityPlaceholder")}</option>
                <option value="SEDENTARY">{tc("profile.activitySedentary")}</option>
                <option value="LIGHT">{tc("profile.activityLight")}</option>
                <option value="MODERATE">{tc("profile.activityModerate")}</option>
                <option value="ACTIVE">{tc("profile.activityActive")}</option>
                <option value="VERY_ACTIVE">{tc("profile.activityVeryActive")}</option>
              </Select>
            </Field>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => router.push(ROUTES.setup.notifications)}>
                {tc("action.skip")}
              </Button>
              <Button type="submit" className="flex-1" loading={loading} loadingText={tc("action.savingEllipsis")}>
                {tc("action.save")}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <DraggableStar />
    </StarBackground>
  );
}
