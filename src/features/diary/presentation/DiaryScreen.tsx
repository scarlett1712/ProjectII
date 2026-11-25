"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, parseISO, startOfMonth, subMonths } from "date-fns";
import { BookOpen, Camera, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { fetchWithCache, notifyDataChanged } from "@/shared/client/cacheSync";
import { useDataSync } from "@/shared/client/hooks";
import { formatDate } from "@/shared/i18n/format";
import { toLocalDateKey, toLocalMonthKey } from "@/features/diary/domain/diaryDate";
import { Button, IconButton, Modal, TextInput, useConfirm, useToast } from "@/shared/ui/components";
import { DiaryPhotoCard } from "./components/DiaryPhotoCard";
import { DiaryCaptureModal } from "./components/DiaryCaptureModal";
import type { DiaryDayResponse, DiaryMonthResponse, DiaryPhoto } from "./types";

const MOODS = ["😊", "🥰", "😌", "😴", "😤", "😢"] as const;

export default function DiaryScreen() {
  const t = useTranslations("diary.screen");
  const tCam = useTranslations("diary.camera");
  const tc = useTranslations("common");
  const toast = useToast();
  const confirm = useConfirm();

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [monthData, setMonthData] = useState<DiaryMonthResponse | null>(null);
  const [dayData, setDayData] = useState<DiaryDayResponse | null>(null);

  const [journalContent, setJournalContent] = useState("");
  const [journalMood, setJournalMood] = useState<string | null>(null);
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  const [captureOpen, setCaptureOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<DiaryPhoto | null>(null);
  const [editCaption, setEditCaption] = useState("");

  const selectedDateKey = toLocalDateKey(selectedDate);
  const selectedMonthKey = toLocalMonthKey(selectedDate);

  const loadMonth = useCallback(() => {
    fetchWithCache<DiaryMonthResponse>(
      withQuery(API_ROUTES.diary.root, { month: selectedMonthKey }),
      undefined,
      { onData: (data) => setMonthData(data) },
    ).catch(() => undefined);
  }, [selectedMonthKey]);

  const loadDay = useCallback(() => {
    fetchWithCache<DiaryDayResponse>(
      withQuery(API_ROUTES.diary.root, { date: selectedDateKey }),
      undefined,
      {
        onData: (data) => {
          setDayData(data);
          setJournalContent(data.entry?.content ?? "");
          setJournalMood(data.entry?.mood ?? null);
        },
      },
    ).catch(() => undefined);
  }, [selectedDateKey]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  useDataSync(
    () => {
      loadMonth();
      loadDay();
    },
    { domains: ["diary"] },
  );

  const monthDays = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // First day of month offset (Monday = 0 .. Sunday = 6)
  const leadingEmptyDays = useMemo(() => {
    const day = startOfMonth(selectedDate).getDay();
    return day === 0 ? 6 : day - 1;
  }, [selectedDate]);

  const photosByDate = useMemo(() => {
    const map = new Map<string, DiaryPhoto[]>();
    for (const p of monthData?.photos ?? []) {
      const list = map.get(p.dateKey) ?? [];
      list.push(p);
      map.set(p.dateKey, list);
    }
    return map;
  }, [monthData]);

  const journalSet = useMemo(() => new Set(monthData?.journalDateKeys ?? []), [monthData]);

  const handleSaveJournal = async () => {
    if (isSavingJournal) return;
    setIsSavingJournal(true);
    try {
      await apiRequest(API_ROUTES.diary.root, {
        method: "PUT",
        body: { dateKey: selectedDateKey, content: journalContent, mood: journalMood },
      });
      notifyDataChanged("diary");
      loadMonth();
      loadDay();
      toast.success(t("journalSaved"));
    } catch (err) {
      toast.error(apiErrorMessage(err, t("journalSaveFailed")));
    } finally {
      setIsSavingJournal(false);
    }
  };

  const handleDeletePhoto = async (photo: DiaryPhoto) => {
    if (!(await confirm({ message: tCam("deletePhotoConfirm"), cancelLabel: tc("action.cancel") }))) return;
    try {
      await apiRequest(withQuery(API_ROUTES.diary.photos, { id: photo.id }), { method: "DELETE" });
      notifyDataChanged("diary");
      loadMonth();
      loadDay();
      toast.success(tCam("photoDeleted"));
    } catch (err) {
      toast.error(apiErrorMessage(err, tCam("photoSaveFailed")));
    }
  };

  const handleSaveCaption = async () => {
    if (!editingPhoto) return;
    try {
      await apiRequest(API_ROUTES.diary.photos, {
        method: "PATCH",
        body: { id: editingPhoto.id, caption: editCaption },
      });
      setEditingPhoto(null);
      notifyDataChanged("diary");
      loadMonth();
      loadDay();
      toast.success(tCam("captionUpdated"));
    } catch (err) {
      toast.error(apiErrorMessage(err, tCam("photoSaveFailed")));
    }
  };

  const dayPhotos = dayData?.photos ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-4xl border border-white/40 bg-white/90 p-5 sm:p-6 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
        </div>
        <Button icon={<Camera className="h-4 w-4" />} onClick={() => setCaptureOpen(true)}>
          {t("captureBtn")}
        </Button>
      </div>

      {/* Main 2-column grid: Month Thumbnail Calendar + Selected Day Feed & Journal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Locket-style Month Calendar */}
        <div className="lg:col-span-5 rounded-4xl border border-white/40 bg-white/95 p-5 sm:p-6 shadow-sm self-start">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 capitalize">
              {t("monthTitle", { monthYear: formatDate(selectedDate, "MM/yyyy") })}
            </h2>
            <div className="flex gap-1.5">
              <IconButton onClick={() => setSelectedDate(subMonths(selectedDate, 1))} label={t("previousMonth")}>
                <ChevronLeft className="h-5 w-5" />
              </IconButton>
              <IconButton onClick={() => setSelectedDate(addMonths(selectedDate, 1))} label={t("nextMonth")}>
                <ChevronRight className="h-5 w-5" />
              </IconButton>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-2xs font-bold text-gray-400">
            {(tc.raw("weekdaysShort") as string[]).map((wd) => (
              <div key={wd} className="py-1">{wd}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: leadingEmptyDays }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {monthDays.map((day) => {
              const key = toLocalDateKey(day);
              const photos = photosByDate.get(key) ?? [];
              const thumb = photos[0]?.imageData;
              const isSelected = isSameDay(day, selectedDate);
              const hasJournal = journalSet.has(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`relative aspect-square overflow-hidden rounded-2xl border transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/40 scale-[1.03]"
                      : "border-gray-100 hover:border-primary/40"
                  } ${!thumb ? "bg-gray-50 flex flex-col items-center justify-center" : ""}`}
                >
                  {thumb ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb} alt={key} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/20" />
                      <span className="absolute top-1 left-1.5 text-2xs font-extrabold text-white drop-shadow">
                        {format(day, "d")}
                      </span>
                      {photos.length > 1 && (
                        <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-3xs font-bold text-white">
                          {photos.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-gray-600"}`}>
                        {format(day, "d")}
                      </span>
                      {hasJournal && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Day Photos + Text Journal */}
        <div className="lg:col-span-7 space-y-6">
          {/* Photos section */}
          <div className="rounded-4xl border border-white/40 bg-white/95 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                {t("photosTab", { count: String(dayPhotos.length) })} — {format(parseISO(selectedDateKey), "dd/MM/yyyy")}
              </h2>
              <Button size="sm" variant="secondary" icon={<Camera className="h-4 w-4" />} onClick={() => setCaptureOpen(true)}>
                {t("captureBtn")}
              </Button>
            </div>

            {dayPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 py-12 text-center">
                <Camera className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-bold text-gray-500">{t("noPhotosDay")}</p>
                <p className="mt-1 text-xs text-gray-400">{t("noPhotosHint")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dayPhotos.map((photo) => (
                  <DiaryPhotoCard
                    key={photo.id}
                    photo={photo}
                    onEditCaption={(p) => {
                      setEditingPhoto(p);
                      setEditCaption(p.caption ?? "");
                    }}
                    onDelete={handleDeletePhoto}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Daily Journal Text Entry */}
          <div className="rounded-4xl border border-white/40 bg-white/95 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                <BookOpen className="h-5 w-5 text-primary" />
                {t("journalTitle", { date: format(parseISO(selectedDateKey), "dd/MM/yyyy") })}
              </h2>
              <div className="flex items-center gap-1">
                <span className="mr-1 text-xs font-semibold text-gray-400">{t("moodLabel")}:</span>
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setJournalMood((prev) => (prev === m ? null : m))}
                    className={`rounded-full p-1 text-base transition ${
                      journalMood === m ? "bg-primary-soft ring-2 ring-primary scale-110" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={5}
              value={journalContent}
              onChange={(e) => setJournalContent(e.target.value)}
              placeholder={t("journalPlaceholder")}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-primary focus:bg-white transition"
            />

            <div className="flex justify-end">
              <Button
                icon={<Save className="h-4 w-4" />}
                loading={isSavingJournal}
                loadingText={tc("action.saving")}
                onClick={handleSaveJournal}
              >
                {t("saveJournal")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Camera / Upload Modal */}
      <DiaryCaptureModal
        open={captureOpen}
        dateKey={selectedDateKey}
        onClose={() => setCaptureOpen(false)}
        onSaved={() => {
          loadMonth();
          loadDay();
        }}
      />

      {/* Edit Caption Modal */}
      <Modal
        open={!!editingPhoto}
        onClose={() => setEditingPhoto(null)}
        title={tCam("editCaption")}
        size="sm"
      >
        <div className="space-y-4">
          <TextInput
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            placeholder={tCam("captionPlaceholder")}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingPhoto(null)}>
              {tc("action.cancel")}
            </Button>
            <Button onClick={handleSaveCaption}>{tCam("saveCaption")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
