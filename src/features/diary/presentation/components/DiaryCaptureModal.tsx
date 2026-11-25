"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw, RotateCcw, UtensilsCrossed, Wallet, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { notifyDataChanged } from "@/shared/client/cacheSync";
import { resizeImageToDataUrl } from "@/shared/client/image";
import { MEAL_CATEGORIES, mealCategoryForHour } from "@/features/nutrition/domain/mealCategories";
import { formatShortCurrencyTag, toLocalDateKey } from "@/features/diary/domain/diaryDate";
import { Button, Modal, SegmentedControl, TextInput, useToast } from "@/shared/ui/components";
import type { DiaryPhoto } from "../types";

interface RecentMeal {
  id: string;
  mealName: string;
  calories: number;
  grams: number;
  note: string | null;
}

interface RecentTransaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  note: string | null;
}

interface BudgetAccountOption {
  id: string;
  name: string;
}

interface BudgetCategoryOption {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}

interface DiaryCaptureModalProps {
  open: boolean;
  dateKey?: string;
  onClose: () => void;
  onSaved: (photo: DiaryPhoto) => void;
}

const PHOTO_MAX_PX = 960;
const PHOTO_JPEG_QUALITY = 0.82;

type MealLink =
  | { kind: "existing"; meal: RecentMeal }
  | { kind: "new"; mealName: string; calories: number; grams: number; note: string };

type TxLink =
  | { kind: "existing"; tx: RecentTransaction }
  | { kind: "new"; amount: number; type: "EXPENSE" | "INCOME"; fromAccountId?: string; toAccountId?: string; categoryId?: string; note?: string };

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

  // Sub-panels for +Bữa ăn and +Xèng
  const [activePanel, setActivePanel] = useState<"meal" | "budget" | null>(null);
  const [mealMode, setMealMode] = useState<"new" | "existing">("new");
  const [txMode, setTxMode] = useState<"new" | "existing">("new");

  const [mealLink, setMealLink] = useState<MealLink | null>(null);
  const [txLink, setTxLink] = useState<TxLink | null>(null);

  // New meal form
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [mealGrams, setMealGrams] = useState("");
  const [mealCategory, setMealCategory] = useState<string>(() => mealCategoryForHour(new Date().getHours()));

  // New transaction form
  const [txType, setTxType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [txAmount, setTxAmount] = useState("");
  const [txAccountId, setTxAccountId] = useState("");
  const [txCategoryId, setTxCategoryId] = useState("");
  const [txNote, setTxNote] = useState("");

  // Recent items for linking
  const [recentMeals, setRecentMeals] = useState<RecentMeal[]>([]);
  const [recentTxs, setRecentTxs] = useState<RecentTransaction[]>([]);
  const [accounts, setAccounts] = useState<BudgetAccountOption[]>([]);
  const [categories, setCategories] = useState<BudgetCategoryOption[]>([]);

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

    // Load recent meals & budget data for quick linking
    const now = new Date();
    apiRequest<RecentMeal[]>(API_ROUTES.meals.root)
      .then((list) => setRecentMeals(list.slice(0, 15)))
      .catch(() => undefined);

    apiRequest<{
      accounts: BudgetAccountOption[];
      categories: BudgetCategoryOption[];
      transactions: RecentTransaction[];
    }>(withQuery(API_ROUTES.budget.root, { year: now.getFullYear(), month: now.getMonth() + 1 }))
      .then((data) => {
        setAccounts(data.accounts ?? []);
        setCategories(data.categories ?? []);
        setRecentTxs((data.transactions ?? []).slice(0, 15));
        if (data.accounts?.[0]?.id) setTxAccountId((prev) => prev || data.accounts[0].id);
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
    setMealLink(null);
    setTxLink(null);
    setMealName("");
    setMealCalories("");
    setMealGrams("");
    setTxAmount("");
    setTxNote("");
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

  const applyNewMeal = () => {
    if (!mealName.trim()) return;
    setMealLink({
      kind: "new",
      mealName: mealName.trim(),
      calories: mealCalories === "" ? 0 : Math.max(0, Math.round(Number(mealCalories))),
      grams: mealGrams === "" ? 0 : Math.max(0, Number(mealGrams)),
      note: mealCategory,
    });
    setActivePanel(null);
  };

  const applyNewTransaction = () => {
    const amount = Number(txAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setTxLink({
      kind: "new",
      amount,
      type: txType,
      fromAccountId: txType === "EXPENSE" ? txAccountId || undefined : undefined,
      toAccountId: txType === "INCOME" ? txAccountId || undefined : undefined,
      categoryId: txCategoryId || undefined,
      note: txNote.trim() || undefined,
    });
    setActivePanel(null);
  };

  const handleSave = async () => {
    if (!imageData || isSaving) return;
    setIsSaving(true);
    try {
      const targetDateKey = dateKey || toLocalDateKey(new Date());
      const body: Record<string, unknown> = {
        imageData,
        caption: caption.trim() || null,
        dateKey: targetDateKey,
      };
      if (mealLink?.kind === "existing") body.mealId = mealLink.meal.id;
      if (mealLink?.kind === "new") {
        body.newMeal = {
          mealName: mealLink.mealName,
          calories: mealLink.calories,
          grams: mealLink.grams,
          note: mealLink.note,
        };
      }
      if (txLink?.kind === "existing") body.transactionId = txLink.tx.id;
      if (txLink?.kind === "new") {
        body.newTransaction = {
          amount: txLink.amount,
          type: txLink.type,
          fromAccountId: txLink.fromAccountId,
          toAccountId: txLink.toAccountId,
          categoryId: txLink.categoryId,
          note: txLink.note,
        };
      }

      const saved = await apiRequest<DiaryPhoto>(API_ROUTES.diary.photos, { method: "POST", body });
      notifyDataChanged("diary");
      if (mealLink?.kind === "new") notifyDataChanged("meals");
      if (txLink?.kind === "new") notifyDataChanged("budget");
      toast.success(t("photoSaved"));
      onSaved(saved);
      handleClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, t("photoSaveFailed")));
    } finally {
      setIsSaving(false);
    }
  };

  const mealTagPreview = mealLink
    ? mealLink.kind === "existing"
      ? mealLink.meal.note
        ? tc(`meal.${mealLink.meal.note}` as "meal.breakfast")
        : mealLink.meal.mealName
      : tc(`meal.${mealLink.note}` as "meal.breakfast")
    : null;

  const txTagPreview = txLink
    ? txLink.kind === "existing"
      ? formatShortCurrencyTag(txLink.tx.amount, txLink.tx.type)
      : formatShortCurrencyTag(txLink.amount, txLink.type)
    : null;

  const filteredCategories = categories.filter((c) => c.type === txType);

  return (
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
                    mealLink || activePanel === "meal"
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
                    txLink || activePanel === "budget"
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

            {/* Meal sub-panel */}
            {activePanel === "meal" && (
              <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">{t("linkMealTitle")}</span>
                  {mealLink && (
                    <button
                      type="button"
                      onClick={() => setMealLink(null)}
                      className="inline-flex items-center gap-1 text-2xs font-bold text-danger"
                    >
                      <X className="h-3 w-3" /> {t("removeLink")}
                    </button>
                  )}
                </div>
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: "new", label: t("modeNew") },
                    { value: "existing", label: t("modeExisting") },
                  ]}
                  value={mealMode}
                  onChange={setMealMode}
                />
                {mealMode === "new" ? (
                  <div className="space-y-2">
                    <TextInput
                      placeholder={tc("mealForm.namePlaceholder")}
                      value={mealName}
                      onChange={(e) => setMealName(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput
                        type="number"
                        placeholder={tc("unit.kcal")}
                        value={mealCalories}
                        onChange={(e) => setMealCalories(e.target.value)}
                      />
                      <TextInput
                        type="number"
                        placeholder="g"
                        value={mealGrams}
                        onChange={(e) => setMealGrams(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(["breakfast", "lunch", "dinner", "snack"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setMealCategory(MEAL_CATEGORIES[cat])}
                          className={`rounded-full px-2.5 py-1 text-2xs font-bold ${
                            mealCategory === MEAL_CATEGORIES[cat]
                              ? "bg-primary text-white"
                              : "bg-white text-gray-600 border border-gray-200"
                          }`}
                        >
                          {tc(`meal.${cat}`)}
                        </button>
                      ))}
                    </div>
                    <Button size="sm" fullWidth onClick={applyNewMeal} disabled={!mealName.trim()}>
                      {tc("action.confirm")}
                    </Button>
                  </div>
                ) : recentMeals.length === 0 ? (
                  <p className="py-2 text-center text-xs text-gray-400">{t("noExistingMeals")}</p>
                ) : (
                  <div className="max-h-36 space-y-1 overflow-y-auto">
                    {recentMeals.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMealLink({ kind: "existing", meal: m });
                          setActivePanel(null);
                        }}
                        className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-xs hover:bg-primary-soft"
                      >
                        <span className="font-bold text-gray-800 truncate">{m.mealName}</span>
                        <span className="text-primary font-bold">{m.calories} {tc("unit.kcal")}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Budget sub-panel */}
            {activePanel === "budget" && (
              <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">{t("linkBudgetTitle")}</span>
                  {txLink && (
                    <button
                      type="button"
                      onClick={() => setTxLink(null)}
                      className="inline-flex items-center gap-1 text-2xs font-bold text-danger"
                    >
                      <X className="h-3 w-3" /> {t("removeLink")}
                    </button>
                  )}
                </div>
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: "new", label: t("modeNew") },
                    { value: "existing", label: t("modeExisting") },
                  ]}
                  value={txMode}
                  onChange={setTxMode}
                />
                {txMode === "new" ? (
                  <div className="space-y-2">
                    <SegmentedControl
                      size="sm"
                      options={[
                        { value: "EXPENSE", label: tc("budget.expense") },
                        { value: "INCOME", label: tc("budget.income") },
                      ]}
                      value={txType}
                      onChange={setTxType}
                    />
                    <TextInput
                      type="number"
                      placeholder={tBudget("transactionModal.amount")}
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={txAccountId}
                        onChange={(e) => setTxAccountId(e.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-700"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <select
                        value={txCategoryId}
                        onChange={(e) => setTxCategoryId(e.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-700"
                      >
                        <option value="">{tBudget("transactionModal.category")}</option>
                        {filteredCategories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <TextInput
                      placeholder={tc("schedule.note")}
                      value={txNote}
                      onChange={(e) => setTxNote(e.target.value)}
                    />
                    <Button size="sm" fullWidth onClick={applyNewTransaction} disabled={!txAmount || Number(txAmount) <= 0}>
                      {tc("action.confirm")}
                    </Button>
                  </div>
                ) : recentTxs.length === 0 ? (
                  <p className="py-2 text-center text-xs text-gray-400">{t("noExistingTransactions")}</p>
                ) : (
                  <div className="max-h-36 space-y-1 overflow-y-auto">
                    {recentTxs.map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => {
                          setTxLink({ kind: "existing", tx });
                          setActivePanel(null);
                        }}
                        className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-xs hover:bg-primary-soft"
                      >
                        <span className="font-bold text-gray-800 truncate">{tx.note || tx.type}</span>
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
  );
}
