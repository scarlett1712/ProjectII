"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Camera, ImagePlus, Plus, RefreshCw, RotateCcw, UtensilsCrossed, Wallet, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { notifyDataChanged } from "@/shared/client/cacheSync";
import { resizeImageToDataUrl } from "@/shared/client/image";
import { MEAL_CATEGORIES, mealCategoryForHour } from "@/features/nutrition/domain/mealCategories";
import { QuickMealModal } from "@/features/dashboard/presentation/components/QuickMealModal";
import { TransactionModal } from "@/features/budget/presentation/components/TransactionModal";
import type { Account, Category, Transaction } from "@/features/budget/presentation/types";
import { formatShortCurrencyTag, toLocalDateKey } from "@/features/diary/domain/diaryDate";
import { Button, Modal, useToast } from "@/shared/ui/components";
import type { DiaryPhoto } from "../types";

interface RecentMeal {
  id: string;
  mealName: string;
  calories: number;
  grams: number;
  note: string | null;
}

interface DiaryCaptureModalProps {
  open: boolean;
  dateKey?: string;
  onClose: () => void;
  onSaved: (photo: DiaryPhoto) => void;
}

const PHOTO_MAX_PX = 960;
const PHOTO_JPEG_QUALITY = 0.82;

export function DiaryCaptureModal({ open, dateKey, onClose, onSaved }: DiaryCaptureModalProps) {
  const t = useTranslations("diary.camera");
  const tc = useTranslations("common");
  const tBudget = useTranslations("budget");
  const toast = useToast();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Picker drawer for linking existing meal / transaction
  const [activePanel, setActivePanel] = useState<"meal" | "budget" | null>(null);
  const [linkedMeal, setLinkedMeal] = useState<RecentMeal | null>(null);
  const [linkedTx, setLinkedTx] = useState<Transaction | null>(null);

  // Reuse existing QuickMealModal & TransactionModal
  const [showMealModal, setShowMealModal] = useState(false);
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [mealForm, setMealForm] = useState({
    name: "",
    grams: "",
    calories: "",
    category: MEAL_CATEGORIES.breakfast as string,
    time: "07:00",
  });
  const [showTxModal, setShowTxModal] = useState(false);

  // Recent items & budget metadata
  const [recentMeals, setRecentMeals] = useState<RecentMeal[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    const now = new Date();
    apiRequest<RecentMeal[]>(API_ROUTES.meals.root)
      .then((list) => setRecentMeals(list.slice(0, 15)))
      .catch(() => undefined);

    apiRequest<{
      accounts: Account[];
      categories: Category[];
      transactions: Transaction[];
    }>(withQuery(API_ROUTES.budget.root, { year: now.getFullYear(), month: now.getMonth() + 1 }))
      .then((data) => {
        setAccounts(data.accounts ?? []);
        setCategories(data.categories ?? []);
        setRecentTxs((data.transactions ?? []).slice(0, 15));
      })
      .catch(() => undefined);

    return () => stopCamera();
  }, [open]);

  useEffect(() => {
    if (!open || imageData) {
      stopCamera();
      return;
    }
    let cancelled = false;
    async function startCamera() {
      stopCamera();
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setCameraError(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        setCameraError(false);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (!cancelled) setCameraError(true);
      }
    }
    void startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, imageData, facingMode]);

  const resetForm = () => {
    setImageData(null);
    setCaption("");
    setActivePanel(null);
    setLinkedMeal(null);
    setLinkedTx(null);
  };

  const handleClose = () => {
    stopCamera();
    resetForm();
    onClose();
  };

  const handleTakePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, PHOTO_MAX_PX / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setImageData(canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY));
    stopCamera();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const compressed = await resizeImageToDataUrl(file, PHOTO_MAX_PX, PHOTO_JPEG_QUALITY);
      setImageData(compressed);
      stopCamera();
    } catch {
      toast.error(t("photoSaveFailed"));
    }
  };

  const handleCreateMeal = async () => {
    if (!mealForm.name.trim() || isSavingMeal) return;
    setIsSavingMeal(true);
    try {
      const eatenAt = new Date();
      const [h, m] = (mealForm.time || "07:00").split(":");
      eatenAt.setHours(Number(h), Number(m), 0, 0);
      const created = await apiRequest<RecentMeal>(API_ROUTES.meals.root, {
        method: "POST",
        body: {
          mealName: mealForm.name.trim(),
          grams: mealForm.grams === "" ? 0 : Number(mealForm.grams),
          calories: mealForm.calories === "" ? 0 : Number(mealForm.calories),
          note: mealForm.category,
          eatenAt: eatenAt.toISOString(),
        },
      });
      notifyDataChanged("meals");
      setLinkedMeal(created);
      setRecentMeals((prev) => [created, ...prev]);
      setShowMealModal(false);
      setActivePanel(null);
      toast.success(tc("mealForm.saved"));
    } catch (err) {
      toast.error(apiErrorMessage(err, tc("mealForm.saveFailed")));
    } finally {
      setIsSavingMeal(false);
    }
  };

  const handleSave = async () => {
    if (!imageData || isSaving) return;
    setIsSaving(true);
    try {
      const targetDateKey = dateKey || toLocalDateKey(new Date());
      const saved = await apiRequest<DiaryPhoto>(API_ROUTES.diary.photos, {
        method: "POST",
        body: {
          imageData,
          caption: caption.trim() || null,
          dateKey: targetDateKey,
          mealId: linkedMeal?.id ?? null,
          transactionId: linkedTx?.id ?? null,
        },
      });
      notifyDataChanged("diary");
      toast.success(t("photoSaved"));
      onSaved(saved);
      handleClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, t("photoSaveFailed")));
    } finally {
      setIsSaving(false);
    }
  };

  const mealTagPreview = linkedMeal
    ? linkedMeal.note
      ? tc(`meal.${linkedMeal.note}` as "meal.breakfast")
      : linkedMeal.mealName
    : null;

  const txTagPreview = linkedTx ? formatShortCurrencyTag(linkedTx.amount, linkedTx.type) : null;

  const txTypeLabel = (type: Transaction["type"]) => {
    if (type === "INCOME") return tc("budget.income");
    if (type === "EXPENSE") return tc("budget.expense");
    return tBudget("quickActions.transferAction");
  };

  return (
    <>
      <Modal open={open} onClose={handleClose} title={t("title")} size="md">
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />

          {/* Camera / Locket Photo Frame */}
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-gray-900 shadow-inner">
            {imageData ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageData} alt="Preview" className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />

                {mealTagPreview && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
                    <UtensilsCrossed className="h-3 w-3" />
                    {mealTagPreview}
                  </span>
                )}

                {txTagPreview && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-rose-600/85 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
                    <Wallet className="h-3 w-3" />
                    {txTagPreview}
                  </span>
                )}

                {/* Bottom-center note overlay input */}
                <div className="absolute inset-x-4 bottom-3 flex justify-center">
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={200}
                    placeholder={t("captionPlaceholder")}
                    className="w-full rounded-full bg-black/55 px-4 py-2 text-center text-sm font-semibold text-white placeholder:text-white/70 backdrop-blur-md outline-none ring-1 ring-white/25 focus:ring-primary"
                  />
                </div>
              </>
            ) : cameraError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white/80">
                <Camera className="h-10 w-10 text-white/50" />
                <p className="text-sm">{t("cameraUnavailable")}</p>
                <Button variant="primary" size="sm" icon={<ImagePlus className="h-4 w-4" />} onClick={() => fileInputRef.current?.click()}>
                  {t("uploadFromDevice")}
                </Button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
              />
            )}
          </div>

          {/* Camera Controls or Preview Controls */}
          {!imageData ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<ImagePlus className="h-4 w-4" />}
                onClick={() => fileInputRef.current?.click()}
              >
                {t("uploadFromDevice")}
              </Button>
              {!cameraError && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw className="h-4 w-4" />}
                    onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
                  >
                    {t("switchCamera")}
                  </Button>
                  <Button variant="primary" size="sm" icon={<Camera className="h-4 w-4" />} onClick={handleTakePhoto}>
                    {t("takePhoto")}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* +Bữa ăn / +Xèng / Retake bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePanel((p) => (p === "meal" ? null : "meal"))}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      linkedMeal || activePanel === "meal"
                        ? "bg-primary text-white shadow-sm"
                        : "bg-primary-soft text-primary-ink hover:bg-primary-tint"
                    }`}
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5" />
                    {t("addMeal")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel((p) => (p === "budget" ? null : "budget"))}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      linkedTx || activePanel === "budget"
                        ? "bg-primary text-white shadow-sm"
                        : "bg-primary-soft text-primary-ink hover:bg-primary-tint"
                    }`}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    {t("addBudget")}
                  </button>
                </div>
                <Button variant="ghost" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setImageData(null)}>
                  {t("retake")}
                </Button>
              </div>

              {/* Meal picker / create drawer */}
              {activePanel === "meal" && (
                <div className="space-y-2.5 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">{t("linkMealTitle")}</span>
                    <div className="flex items-center gap-2">
                      {linkedMeal && (
                        <button
                          type="button"
                          onClick={() => setLinkedMeal(null)}
                          className="inline-flex items-center gap-1 text-2xs font-bold text-danger"
                        >
                          <X className="h-3 w-3" /> {t("removeLink")}
                        </button>
                      )}
                      <Button
                        size="sm"
                        icon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() => {
                          const now = new Date();
                          setMealForm({
                            name: "",
                            grams: "",
                            calories: "",
                            category: mealCategoryForHour(now.getHours()),
                            time: format(now, "HH:mm"),
                          });
                          setShowMealModal(true);
                        }}
                      >
                        {t("modeNew")}
                      </Button>
                    </div>
                  </div>
                  {recentMeals.length === 0 ? (
                    <p className="py-2 text-center text-xs text-gray-400">{t("noExistingMeals")}</p>
                  ) : (
                    <div className="max-h-36 space-y-1 overflow-y-auto">
                      {recentMeals.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setLinkedMeal(m);
                            setActivePanel(null);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                            linkedMeal?.id === m.id ? "bg-primary-soft ring-1 ring-primary" : "bg-white hover:bg-primary-soft"
                          }`}
                        >
                          <span className="font-bold text-gray-800 truncate">{m.mealName}</span>
                          <span className="text-primary font-bold">{m.calories} {tc("unit.kcal")}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Budget picker / create drawer */}
              {activePanel === "budget" && (
                <div className="space-y-2.5 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">{t("linkBudgetTitle")}</span>
                    <div className="flex items-center gap-2">
                      {linkedTx && (
                        <button
                          type="button"
                          onClick={() => setLinkedTx(null)}
                          className="inline-flex items-center gap-1 text-2xs font-bold text-danger"
                        >
                          <X className="h-3 w-3" /> {t("removeLink")}
                        </button>
                      )}
                      <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowTxModal(true)}>
                        {t("modeNew")}
                      </Button>
                    </div>
                  </div>
                  {recentTxs.length === 0 ? (
                    <p className="py-2 text-center text-xs text-gray-400">{t("noExistingTransactions")}</p>
                  ) : (
                    <div className="max-h-36 space-y-1 overflow-y-auto">
                      {recentTxs.map((tx) => (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() => {
                            setLinkedTx(tx);
                            setActivePanel(null);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                            linkedTx?.id === tx.id ? "bg-primary-soft ring-1 ring-primary" : "bg-white hover:bg-primary-soft"
                          }`}
                        >
                          <span className="font-bold text-gray-800 truncate">
                            {tx.note || tx.category?.name || txTypeLabel(tx.type)}
                          </span>
                          <span className="font-bold text-primary">{formatShortCurrencyTag(tx.amount, tx.type)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button fullWidth loading={isSaving} loadingText={tc("action.saving")} onClick={handleSave}>
                {t("savePhoto")}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Reuse existing QuickMealModal */}
      <QuickMealModal
        showAddMeal={showMealModal}
        onClose={() => setShowMealModal(false)}
        mealForm={mealForm}
        setMealForm={setMealForm}
        handleSaveMeal={handleCreateMeal}
        isSubmitting={isSavingMeal}
      />

      {/* Reuse existing TransactionModal */}
      <TransactionModal
        isOpen={showTxModal}
        onClose={() => setShowTxModal(false)}
        accounts={accounts}
        categories={categories}
        onSuccess={(savedTx) => {
          if (savedTx) {
            setLinkedTx(savedTx);
            setRecentTxs((prev) => [savedTx, ...prev]);
          }
          setActivePanel(null);
        }}
      />
    </>
  );
}
