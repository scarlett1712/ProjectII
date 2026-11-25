"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X } from "lucide-react";
import { effects } from "@/shared/theme/tokens";
import { Button, IconButton, Spinner, useToast } from "@/shared/ui/components";
import { API_ROUTES } from "@/shared/config/routes";
import { DATA_SYNC_EVENT, notifyDataChanged } from "@/shared/client/cacheSync";
import { onStarNotification } from "@/shared/client/appEvents";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { useUserSettings } from "@/shared/client/settingsContext";
import { isWithinQuietHours } from "@/shared/domain/settings";
import { StarPetSprite } from "./StarPetSprite";
import {
  fetchWeatherSummary,
  formatBriefingMessage,
  getCelebrateLine,
  getDragLine,
  getPokeLine,
  getSingLine,
  playStarChime,
  type PetMood,
} from "./starPersonalities";

const DESKTOP_STAR_SIZE = 130;
const MOBILE_STAR_SIZE = 88;

type PortionOption = {
  label: string;
  value: string;
};

/** Dismiss the calorie estimate notification after 2.5 seconds. */
const ESTIMATE_ALERT_CLOSE_MS = 2500;

type AlertPayload = {
  message: string;
  type: string;
  amountMl?: number;
  slotId?: string;
  mealId?: string;
  mealName?: string;
  portions?: PortionOption[];
};

export function DraggableStar({ onClick, children }: { onClick?: () => void; children?: React.ReactNode }) {
  const tShell = useTranslations("shell");
  const tc = useTranslations("common");
  const toast = useToast();
  const { settings, loading: settingsLoading } = useUserSettings();
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [alert, setAlert] = useState<AlertPayload | null>(null);
  const [customPortion, setCustomPortion] = useState("");
  const [mood, setMood] = useState<PetMood>("idle");
  const [facing, setFacing] = useState<"left" | "right">("left");
  const [petSpeech, setPetSpeech] = useState<string | null>(null);
  const speechTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const speak = (text: string, durationMs = 4500) => {
    clearTimeout(speechTimer.current);
    setPetSpeech(text);
    if (durationMs > 0) {
      speechTimer.current = setTimeout(() => setPetSpeech(null), durationMs);
    }
  };
  useEffect(() => () => clearTimeout(speechTimer.current), []);
  
  const pointerRef = useRef({
    pointerId: -1, offsetX: 0, offsetY: 0,
    startX: 0, startY: 0, moved: false,
  });

  const starSize = isMobile ? MOBILE_STAR_SIZE : DESKTOP_STAR_SIZE;

  useEffect(() => {
    setIsMounted(true);
    const mobile = window.innerWidth < 850;
    const currentSize = mobile ? MOBILE_STAR_SIZE : DESKTOP_STAR_SIZE;
    setIsMobile(mobile);
    setPosition({
      x: Math.max(10, window.innerWidth - currentSize - 16),
      y: Math.max(10, window.innerHeight - currentSize - (mobile ? 85 : 20)),
    });
    
    function onResize() {
      const mob = window.innerWidth < 850;
      const size = mob ? MOBILE_STAR_SIZE : DESKTOP_STAR_SIZE;
      setIsMobile(mob);
      setPosition((prev) => ({
        x: Math.min(Math.max(10, prev.x), Math.max(10, window.innerWidth - size - 10)),
        y: Math.min(Math.max(10, prev.y), Math.max(10, window.innerHeight - size - (mob ? 85 : 15))),
      }));
    }
    
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!alert) {
      setCustomPortion("");
    }
  }, [alert]);

  // Increment alertVersion for each notification so an older asynchronous result cannot replace a newer alert.
  const alertVersion = useRef(0);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(autoCloseTimer.current), []);
  const showAlert = (next: AlertPayload | null) => {
    alertVersion.current += 1;
    clearTimeout(autoCloseTimer.current);
    setAlert(next);
    return alertVersion.current;
  };

  // Listen to global notifications
  useEffect(() => {
    const handleNotification = async (payload: AlertPayload) => {
      
      if (payload.type === "meal-estimate" && payload.mealName && payload.mealId) {
        // Show loading state first!
        const version = showAlert({
          type: "meal-estimate-loading",
          message: tShell("mascot.mealLoading", { mealName: payload.mealName }),
          mealId: payload.mealId,
          mealName: payload.mealName,
        });
        
        try {
          const data = await apiRequest<{ portions: AlertPayload["portions"] }>(API_ROUTES.meals.suggestPortions, {
            method: "POST",
            body: { mealName: payload.mealName },
          });
          if (version === alertVersion.current) {
            setAlert({
              type: "meal-estimate",
              message: tShell("mascot.mealAskPortion", { mealName: payload.mealName }),
              mealId: payload.mealId,
              mealName: payload.mealName,
              portions: data.portions,
            });
          }
          return;
        } catch (err) {
          console.error("Failed to fetch portions:", err);
        }
        if (version !== alertVersion.current) return;

        // Fallback standard options if fetch fails
        setAlert({
          type: "meal-estimate",
          message: tShell("mascot.mealAskPortionFallback", { mealName: payload.mealName }),
          mealId: payload.mealId,
          mealName: payload.mealName,
          portions: [
            { label: tShell("mascot.portionSmall"), value: "small" },
            { label: tShell("mascot.portionMedium"), value: "medium" },
            { label: tShell("mascot.portionLarge"), value: "large" }
          ],
        });
      } else {
        showAlert(payload);
      }
    };

    return onStarNotification((detail) => void handleNotification(detail));
  }, [tShell]);

  // Morning / session startup briefing: greeting + weather + today's schedule summary
  useEffect(() => {
    if (!isMounted || settingsLoading || typeof window === "undefined") return;
    if (sessionStorage.getItem("star-briefed")) return;

    const now = new Date();
    const todayStr = now.toDateString();
    let cancelled = false;

    async function runBriefing() {
      const currentSettings = settingsRef.current;
      const [weather, tasks, events] = await Promise.all([
        fetchWeatherSummary(currentSettings.weatherCity),
        apiRequest<{ completed: boolean; dueAt?: string | null }[]>(API_ROUTES.tasks).catch(() => []),
        apiRequest<{ startAt: string }[]>(API_ROUTES.calendar).catch(() => []),
      ]);
      if (cancelled) return;
      sessionStorage.setItem("star-briefed", "1");
      const pendingTasks = tasks.filter((t) => !t.completed && (!t.dueAt || new Date(t.dueAt).toDateString() === todayStr)).length;
      const todayEvents = events.filter((e) => new Date(e.startAt).toDateString() === todayStr).length;
      speak(formatBriefingMessage(currentSettings.starPersonality, now.getHours(), weather, pendingTasks, todayEvents), 8000);
      if (currentSettings.starSoundEnabled && !isWithinQuietHours(currentSettings)) playStarChime();
    }

    const t = setTimeout(() => void runBriefing(), 700);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isMounted, settingsLoading]);

  // Autonomous roaming, singing/dancing, and sleepy night state
  useEffect(() => {
    if (!isMounted || alert) return;
    if (!settings.starRoamEnabled) {
      const hour = new Date().getHours();
      setMood(hour >= 23 || hour < 5 ? "sleepy" : "idle");
      return;
    }

    let walkStopTimer: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      if (pointerRef.current.pointerId !== -1) return;
      const maxX = Math.max(16, window.innerWidth - starSize - 16);
      const maxY = Math.max(16, window.innerHeight - starSize - (isMobile ? 90 : 20));
      const nextX = Math.round(16 + Math.random() * (maxX - 16));
      const nextY = Math.round(Math.max(80, maxY * (0.45 + Math.random() * 0.55)));

      setPosition((prev) => {
        setFacing(nextX < prev.x ? "left" : "right");
        return { x: nextX, y: nextY };
      });
      setMood("walking");

      walkStopTimer = setTimeout(() => {
        if (pointerRef.current.pointerId !== -1) return;
        const roll = Math.random();
        const hour = new Date().getHours();
        if (hour >= 23 || hour < 5) {
          setMood("sleepy");
        } else if (roll < 0.32) {
          setMood("singing");
          speak(getSingLine(settings.starPersonality), 3800);
        } else {
          setMood("idle");
        }
      }, 2200);
    }, 9500);

    return () => {
      clearInterval(interval);
      clearTimeout(walkStopTimer);
    };
  }, [isMounted, isMobile, starSize, alert, settings.starRoamEnabled, settings.starPersonality]);

  // Celebrate when user completes a task, logs water, or saves a diary photo
  useEffect(() => {
    const onSync = (ev: Event) => {
      const domain = (ev as CustomEvent<{ domain?: string }>).detail?.domain;
      if (domain === "tasks" || domain === "water" || domain === "diary") {
        setMood("celebrating");
        speak(getCelebrateLine(settings.starPersonality), 3600);
        if (settings.starSoundEnabled && !isWithinQuietHours(settings)) playStarChime();
        setTimeout(() => setMood((m) => (m === "celebrating" ? "idle" : m)), 3200);
      }
    };
    window.addEventListener(DATA_SYNC_EVENT, onSync);
    return () => window.removeEventListener(DATA_SYNC_EVENT, onSync);
  }, [settings]);

  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(10, x), Math.max(10, window.innerWidth - starSize - 10)),
    y: Math.min(Math.max(10, y), Math.max(10, window.innerHeight - starSize - (isMobile ? 85 : 15))),
  });

  const handleLogWater = async (amountMl: number) => {
    try {
      await apiRequest(API_ROUTES.water, { method: "POST", body: { amountMl } });
      // Refresh open screens and clear the water cache.
      notifyDataChanged("water");
      toast.success(tc("water.loggedNotice", { amountMl: String(amountMl) }));
    } catch (e) {
      toast.error(apiErrorMessage(e, tShell("mascot.waterLogFailed")));
    } finally {
      showAlert(null);
    }
  };

  const handleEstimateMeal = async (mealId: string, portionLabel: string, portionValue: string) => {
    const version = showAlert({ type: "info", message: tShell("mascot.estimating") });
    try {
      const data = await apiRequest<{ success?: boolean; explanation?: string }>(API_ROUTES.meals.estimate, {
        method: "POST",
        body: { mealId, portionLabel, portionValue },
      });
      if (version !== alertVersion.current) return;
      if (!data.success) {
        showAlert(null);
        return;
      }
      const msg = data.explanation || tShell("mascot.estimated");
      setAlert({ type: "info", message: msg });
      notifyDataChanged("meals");
      toast.success(msg);
      autoCloseTimer.current = setTimeout(() => setAlert(null), ESTIMATE_ALERT_CLOSE_MS);
    } catch (e) {
      if (version !== alertVersion.current) return;
      showAlert(null);
      toast.error(apiErrorMessage(e, tShell("mascot.estimateFailed")));
    }
  };

  if (!isMounted) return null;
  const isAlerting = !!alert;
  const isLeftHalf = position.x < window.innerWidth / 2;
  const bubbleWidth = Math.min(260, window.innerWidth - 24);
  const bubbleLeft =
    Math.min(Math.max(12, position.x + starSize / 2 - bubbleWidth / 2), Math.max(12, window.innerWidth - bubbleWidth - 12)) -
    position.x;

  return (
    <>
      <AnimatePresence>
        {isAlerting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[240] pointer-events-auto"
            onClick={() => showAlert(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="fixed z-[250] pointer-events-none"
        animate={isAlerting ? {
          left: isMobile ? `calc(50vw - ${starSize / 2}px)` : `calc(50vw - ${starSize + 140}px)`,
          top: isMobile ? "calc(10vh)" : `calc(50vh - ${starSize / 2}px)`,
        } : {
          left: position.x,
          top: position.y,
        }}
        transition={mood === "walking" ? { duration: 2.1, ease: "easeInOut" } : { type: "spring", stiffness: 120, damping: 18 }}
        style={{ width: starSize, height: starSize }}
      >
        {/* Ambient Pet Speech Bubble (greeting, weather, singing, dragging/pouting) */}
        <AnimatePresence>
          {!isAlerting && petSpeech && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.92 }}
              style={{ left: bubbleLeft, width: bubbleWidth }}
              className="absolute bottom-full mb-3 rounded-2xl border border-purple-100 bg-white/95 px-3.5 py-2.5 text-xs font-bold text-gray-700 shadow-lg backdrop-blur-md pointer-events-auto break-words"
            >
              <button
                type="button"
                onClick={() => setPetSpeech(null)}
                aria-label={tc("action.close")}
                className="float-right ml-1.5 text-gray-400 hover:text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="leading-relaxed">{petSpeech}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alert / Notification Speech Bubble */}
        <AnimatePresence>
          {isAlerting && alert && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              className={`absolute bg-white rounded-3xl p-5 shadow-brand-hover border border-purple-100 pointer-events-auto text-center space-y-4 flex flex-col items-center z-50 ${
                isMobile
                  ? "top-full mt-4 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm max-h-[70vh] overflow-y-auto"
                  : "left-full top-1/2 -translate-y-1/2 ml-8 w-80 max-h-[85vh] overflow-y-auto"
              }`}
            >
              <div className="bg-purple-100 text-primary p-2.5 rounded-2xl">
                <Bell className="h-6 w-6" />
              </div>
              
              <p className="text-sm font-bold text-gray-700 leading-relaxed">
                {alert.message}
              </p>

              <div className="flex flex-col gap-2 w-full">
                {alert.type === "water" && alert.amountMl && (
                  <div className="flex gap-2 w-full">
                    <Button
                      size="sm"
                      className="flex-1"
                      icon={<Check className="h-3.5 w-3.5" />}
                      onClick={() => handleLogWater(alert.amountMl!)}
                    >
                      {tShell("mascot.drank")}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      icon={<X className="h-3.5 w-3.5" />}
                      onClick={() => showAlert(null)}
                    >
                      {tc("action.close")}
                    </Button>
                  </div>
                )}
                
                {alert.type === "meal-estimate" && alert.portions && alert.mealId && (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {alert.portions.map((port, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleEstimateMeal(alert.mealId!, port.label, port.value)}
                          className="w-full bg-primary-soft hover:bg-primary-faint text-primary py-2.5 px-3 rounded-xl text-xs font-bold transition-all border border-purple-100 text-center whitespace-normal break-words active:scale-98 shadow-sm cursor-pointer"
                        >
                          {port.label}
                        </button>
                      ))}
                    </div>

                    <div className="w-full flex items-center gap-2 my-0.5">
                      <hr className="flex-1 border-line" />
                      <span className="text-2xs text-gray-400 font-medium whitespace-nowrap">{tShell("mascot.customPortionDivider")}</span>
                      <hr className="flex-1 border-line" />
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder={tShell("mascot.customPortionPlaceholder")}
                        value={customPortion}
                        onChange={(e) => setCustomPortion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customPortion.trim()) {
                            handleEstimateMeal(alert.mealId!, customPortion.trim(), "custom");
                          }
                        }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-3 pr-9 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary pointer-events-auto"
                      />
                      {customPortion.trim() && (
                        <IconButton
                          label={tc("action.confirm")}
                          onClick={() => handleEstimateMeal(alert.mealId!, customPortion.trim(), "custom")}
                          className="absolute right-1.5"
                        >
                          <Check className="h-4 w-4" />
                        </IconButton>
                      )}
                    </div>

                    <Button variant="secondary" size="sm" fullWidth className="mt-0.5" onClick={() => showAlert(null)}>
                      {tc("action.skip")}
                    </Button>
                  </div>
                )}

                {alert.type === "meal-estimate-loading" && (
                  <div className="flex items-center justify-center py-2">
                    <Spinner className="h-5 w-5 text-primary" />
                  </div>
                )}
                
                {alert.type !== "water" && alert.type !== "meal-estimate" && alert.type !== "meal-estimate-loading" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    icon={<X className="h-3.5 w-3.5" />}
                    onClick={() => showAlert(null)}
                  >
                    {tc("action.close")}
                  </Button>
                )}
              </div>
              {/* Arrow pointer */}
              <div className={
                isAlerting 
                  ? (isMobile 
                      ? "absolute bottom-full left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-purple-100 rotate-45 -mb-2"
                      : "absolute right-full top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-l border-b border-purple-100 rotate-45 -mr-2")
                  : "absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-purple-100 rotate-45 -mt-2"
              } />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Standard Popup Children when NOT alerting */}
        {!isAlerting && (
          <div className={`absolute bottom-full mb-4 pointer-events-auto ${isLeftHalf ? "left-0" : "right-0"}`}>
            {children}
          </div>
        )}

        {/* Ripple Rings */}
        {isAlerting && (
          <>
            {[...Array(2)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border-2 border-yellow-300/40 pointer-events-none"
                style={{
                  width: starSize,
                  height: starSize,
                  left: 0,
                  top: 0,
                  zIndex: 42,
                }}
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{
                  opacity: [0.8, 0],
                  scale: [1, 1.8],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.5,
                  delay: i * 0.8,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}

        {/* Sparkling particles */}
        {isAlerting && (
          <>
            {[...Array(8)].map((_, i) => {
              const angle = (i * 360) / 8;
              const radian = (angle * Math.PI) / 180;
              const distance = isMobile ? 60 : 90;
              const tx = Math.cos(radian) * distance;
              const ty = Math.sin(radian) * distance;
              
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    scale: [0, 1.4, 1, 0],
                    x: [0, tx * 1.1, tx],
                    y: [0, ty * 1.1, ty],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    delay: (i % 3) * 0.4,
                    ease: "easeOut",
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-yellow-300 text-xl font-bold"
                  style={{ zIndex: 45 }}
                >
                  {tShell("mascot.sparkle")}
                </motion.div>
              );
            })}
          </>
        )}

        {/* Star button */}
        <motion.button
          id="tour-chatbot-star"
          type="button"
          aria-label={tShell("mascot.openChatbotAria")}
          className={`outline-none select-none transition-all ${
            isAlerting ? "pointer-events-none" : "pointer-events-auto cursor-grab active:cursor-grabbing"
          }`}
          style={{ width: starSize, height: starSize, touchAction: "none" }}
          animate={isAlerting ? {
            scale: isMobile ? [1.05, 1.15, 1.05] : [1.15, 1.25, 1.15],
            rotate: [0, 360],
            filter: [
              effects.starGlow,
              effects.starGlowPeak,
              effects.starGlow
            ]
          } : {
            scale: 1,
            rotate: 0,
            filter: effects.starShadow
          }}
          transition={isAlerting ? {
            rotate: { repeat: Infinity, duration: 4, ease: "linear" },
            scale: { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
            filter: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
          } : {
            rotate: { duration: 0.3 },
            scale: { duration: 0.3 },
            filter: { duration: 0.3 }
          }}
          onPointerDown={(e) => {
            if (isAlerting) return;
            const p = pointerRef.current;
            p.pointerId = e.pointerId;
            p.offsetX = e.clientX - position.x;
            p.offsetY = e.clientY - position.y;
            p.startX = e.clientX;
            p.startY = e.clientY;
            p.moved = false;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (isAlerting) return;
            const p = pointerRef.current;
            if (p.pointerId !== e.pointerId) return;
            if (!p.moved && (Math.abs(e.clientX - p.startX) > 4 || Math.abs(e.clientY - p.startY) > 4)) {
              p.moved = true;
              setMood("dragging");
              speak(getDragLine(settings.starPersonality), 2200);
            }
            setPosition(clamp(e.clientX - p.offsetX, e.clientY - p.offsetY));
          }}
          onPointerUp={(e) => {
            if (isAlerting) return;
            const p = pointerRef.current;
            if (p.pointerId !== e.pointerId) return;
            e.currentTarget.releasePointerCapture(e.pointerId);
            if (p.moved) {
              setMood("pouting");
              setTimeout(() => setMood((m) => (m === "pouting" ? "idle" : m)), 1600);
            } else if (onClick) {
              onClick();
            }
            p.pointerId = -1;
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (isAlerting) return;
            setMood("celebrating");
            speak(getPokeLine(settings.starPersonality), 3000);
            setTimeout(() => setMood((m) => (m === "celebrating" ? "idle" : m)), 1800);
          }}
        >
          <StarPetSprite
            size={starSize}
            alt={tShell("mascot.imageAlt")}
            mood={isAlerting ? "celebrating" : mood}
            facing={facing}
          />
        </motion.button>
      </motion.div>
    </>
  );
}
