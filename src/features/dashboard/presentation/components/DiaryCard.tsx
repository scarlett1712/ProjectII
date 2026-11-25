"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth, subMonths } from "date-fns";
import { ArrowUpRight, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { API_ROUTES, ROUTES, withQuery } from "@/shared/config/routes";
import { fetchWithCache } from "@/shared/client/cacheSync";
import { useDataSync } from "@/shared/client/hooks";
import { formatDate } from "@/shared/i18n/format";
import { toLocalDateKey, toLocalMonthKey } from "@/features/diary/domain/diaryDate";
import { DiaryPhotoCard } from "@/features/diary/presentation/components/DiaryPhotoCard";
import { DiaryCaptureModal } from "@/features/diary/presentation/components/DiaryCaptureModal";
import type { DiaryMonthResponse, DiaryPhoto } from "@/features/diary/presentation/types";
import { Button, IconButton, SegmentedControl } from "@/shared/ui/components";

export function DiaryCard() {
  const t = useTranslations("diary.dashboard");
  const tScreen = useTranslations("diary.screen");
  const tc = useTranslations("common");

  const [mode, setMode] = useState<"month" | "day">("month");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [monthData, setMonthData] = useState<DiaryMonthResponse | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [captureOpen, setCaptureOpen] = useState(false);

  const selectedMonthKey = toLocalMonthKey(selectedDate);
  const selectedDateKey = toLocalDateKey(selectedDate);
  const isFutureDay = selectedDateKey > toLocalDateKey(new Date());

  const loadMonth = useCallback(() => {
    fetchWithCache<DiaryMonthResponse>(
      withQuery(API_ROUTES.diary.root, { month: selectedMonthKey }),
      undefined,
      { onData: (data) => setMonthData(data) },
    ).catch(() => undefined);
  }, [selectedMonthKey]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useDataSync(loadMonth, { domains: ["diary"] });

  const photosByDate = useMemo(() => {
    const map = new Map<string, DiaryPhoto[]>();
    for (const p of monthData?.photos ?? []) {
      const list = map.get(p.dateKey) ?? [];
      list.push(p);
      map.set(p.dateKey, list);
    }
    return map;
  }, [monthData]);

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) }),
    [selectedDate],
  );

  const leadingEmptyDays = useMemo(() => {
    const day = startOfMonth(selectedDate).getDay();
    return day === 0 ? 6 : day - 1;
  }, [selectedDate]);

  const dayPhotos = photosByDate.get(selectedDateKey) ?? [];
  const activePhoto = dayPhotos[Math.min(photoIdx, Math.max(0, dayPhotos.length - 1))] ?? null;

  return (
    <div className="col-span-1 xl:col-span-4">
      <section className="flex h-full flex-col justify-between rounded-4xl bg-white p-5 sm:p-6 shadow-sm">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Link
              href={ROUTES.diary}
              className="inline-flex items-center gap-1 text-xl font-bold text-primary hover:opacity-80 transition"
            >
              <span>{t("title")}</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <SegmentedControl
              size="sm"
              className="w-28"
              ariaLabel={t("title")}
              options={[
                { value: "month", label: t("monthView") },
                { value: "day", label: t("dayView") },
              ]}
              value={mode}
              onChange={(m) => {
                setMode(m);
                setPhotoIdx(0);
              }}
            />
            <IconButton label={t("quickCapture")} disabled={isFutureDay} onClick={() => setCaptureOpen(true)}>
              <Camera className="h-4 w-4 text-primary" />
            </IconButton>
          </div>
        </div>

        {/* Body */}
        {mode === "month" ? (
          <div className="flex-1 flex flex-col justify-between">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 capitalize">
                {formatDate(selectedDate, "MM/yyyy")}
              </span>
              <div className="flex gap-1">
                <IconButton onClick={() => setSelectedDate(subMonths(selectedDate, 1))} label={tScreen("previousMonth")}>
                  <ChevronLeft className="h-4 w-4" />
                </IconButton>
                <IconButton onClick={() => setSelectedDate(addMonths(selectedDate, 1))} label={tScreen("nextMonth")}>
                  <ChevronRight className="h-4 w-4" />
                </IconButton>
              </div>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-3xs font-bold text-gray-400">
              {(tc.raw("weekdaysShort") as string[]).map((wd) => (
                <div key={wd}>{wd}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: leadingEmptyDays }).map((_, i) => (
                <div key={`e-${i}`} className="aspect-square" />
              ))}
              {monthDays.map((day) => {
                const key = toLocalDateKey(day);
                const photos = photosByDate.get(key) ?? [];
                const thumb = photos[0]?.imageData;
                const isSelected = isSameDay(day, selectedDate);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day);
                      setPhotoIdx(0);
                      setMode("day");
                    }}
                    className={`relative aspect-square overflow-hidden rounded-xl border transition ${
                      isSelected ? "border-primary ring-2 ring-primary/30" : "border-gray-100 hover:border-primary/40"
                    } ${!thumb ? "bg-gray-50 flex items-center justify-center" : ""}`}
                  >
                    {thumb ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumb} alt={key} className="h-full w-full object-cover" />
                        <span className="absolute inset-0 bg-black/15" />
                        <span className="absolute top-0.5 left-1 text-3xs font-extrabold text-white drop-shadow">
                          {format(day, "d")}
                        </span>
                      </>
                    ) : (
                      <span className={`text-2xs font-bold ${isSelected ? "text-primary" : "text-gray-500"}`}>
                        {format(day, "d")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>{format(selectedDate, "dd/MM/yyyy")}</span>
              {dayPhotos.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPhotoIdx((i) => (i - 1 + dayPhotos.length) % dayPhotos.length)}
                    className="rounded-full bg-gray-100 p-1 hover:bg-primary-soft"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span>{photoIdx + 1}/{dayPhotos.length}</span>
                  <button
                    type="button"
                    onClick={() => setPhotoIdx((i) => (i + 1) % dayPhotos.length)}
                    className="rounded-full bg-gray-100 p-1 hover:bg-primary-soft"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {activePhoto ? (
              <DiaryPhotoCard photo={activePhoto} compact />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 py-10 text-center">
                <Camera className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-xs font-semibold text-gray-400">{t("emptyDay")}</p>
                {!isFutureDay && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    icon={<Camera className="h-3.5 w-3.5" />}
                    onClick={() => setCaptureOpen(true)}
                  >
                    {t("emptyDayCta")}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <DiaryCaptureModal
        open={captureOpen}
        dateKey={selectedDateKey}
        onClose={() => setCaptureOpen(false)}
        onSaved={() => {
          setMode("day");
          setPhotoIdx(0);
          loadMonth();
        }}
      />
    </div>
  );
}
