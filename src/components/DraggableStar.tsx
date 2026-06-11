"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X } from "lucide-react";

const STAR_SIZE = 140;

type PortionOption = {
  label: string;
  value: string;
};

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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [alert, setAlert] = useState<AlertPayload | null>(null);
  
  const pointerRef = useRef({
    pointerId: -1, offsetX: 0, offsetY: 0,
    startX: 0, startY: 0, moved: false,
  });

  useEffect(() => {
    setIsMounted(true);
    setPosition({
      x: Math.max(10, window.innerWidth - STAR_SIZE - 14),
      y: Math.max(10, window.innerHeight - STAR_SIZE - 12),
    });
    
    function onResize() {
      setPosition((prev) => ({
        x: Math.min(Math.max(10, prev.x), Math.max(10, window.innerWidth - STAR_SIZE - 10)),
        y: Math.min(Math.max(10, prev.y), Math.max(10, window.innerHeight - STAR_SIZE - 10)),
      }));
    }
    
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Listen to global notifications
  useEffect(() => {
    const handleNotification = async (e: Event) => {
      const customEvent = e as CustomEvent<AlertPayload>;
      const payload = customEvent.detail;
      
      if (payload.type === "meal-estimate" && payload.mealName && payload.mealId) {
        // Show loading state first!
        setAlert({
          type: "meal-estimate-loading",
          message: `Chờ Star xíu nha, đang xem món "${payload.mealName}" nên ăn lượng thế nào nè... 💖`,
          mealId: payload.mealId,
          mealName: payload.mealName,
        });
        
        try {
          const res = await fetch("/api/meals/suggest-portions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mealName: payload.mealName }),
          });
          if (res.ok) {
            const data = await res.json();
            setAlert({
              type: "meal-estimate",
              message: `Món "${payload.mealName}" ngon quá bạn iu ơi! Khẩu phần hôm nay thế nào để Star tính kcal chính xác nha? 🥰`,
              mealId: payload.mealId,
              mealName: payload.mealName,
              portions: data.portions,
            });
            return;
          }
        } catch (err) {
          console.error("Failed to fetch portions:", err);
        }
        
        // Fallback standard options if fetch fails
        setAlert({
          type: "meal-estimate",
          message: `Món "${payload.mealName}" thế nào bạn iu nhỉ? Chọn khẩu phần để Star tính kcal nha! 🥰`,
          mealId: payload.mealId,
          mealName: payload.mealName,
          portions: [
            { label: "Ít / Nhỏ", value: "small" },
            { label: "Vừa / Trung bình", value: "medium" },
            { label: "Nhiều / Lớn", value: "large" }
          ],
        });
      } else {
        setAlert(payload);
      }
    };

    window.addEventListener("star-notification", handleNotification);
    return () => window.removeEventListener("star-notification", handleNotification);
  }, []);

  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(10, x), Math.max(10, window.innerWidth - STAR_SIZE - 10)),
    y: Math.min(Math.max(10, y), Math.max(10, window.innerHeight - STAR_SIZE - 10)),
  });

  const handleLogWater = async (amountMl: number) => {
    try {
      await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl }),
      });
      // Refresh the page to sync water progress
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setAlert(null);
    }
  };

  const handleEstimateMeal = async (mealId: string, portionLabel: string, portionValue: string) => {
    try {
      setAlert({
        type: "info",
        message: "Đang tính lượng kcal cho bạn iu nè... ✨"
      });
      const res = await fetch("/api/meals/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealId, portionLabel, portionValue }),
      });
      const data = await res.json();
      if (data.success) {
        setAlert({
          type: "info",
          message: data.explanation || `Star đã cập nhật lượng calo của món ăn rồi nha! 💕`
        });
        setTimeout(() => {
          setAlert(null);
          window.location.reload(); // Refresh the page to sync progress charts
        }, 3000);
      } else {
        setAlert(null);
      }
    } catch (e) {
      console.error(e);
      setAlert(null);
    }
  };

  if (!isMounted) return null;
  const isAlerting = !!alert;
  const isLeftHalf = position.x < window.innerWidth / 2;

  return (
    <>
      <AnimatePresence>
        {isAlerting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[240] pointer-events-auto"
            onClick={() => setAlert(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="fixed z-[250] pointer-events-none"
      animate={isAlerting ? {
        left: "calc(50vw - 70px)",
        top: "calc(50vh - 70px)",
      } : {
        left: position.x,
        top: position.y,
      }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      style={{ width: STAR_SIZE, height: STAR_SIZE }}
    >
      {/* Alert / Notification Speech Bubble */}
      <AnimatePresence>
        {isAlerting && alert && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            className={`absolute w-72 bg-white rounded-3xl p-5 shadow-[0_15px_40px_rgba(139,92,246,0.25)] border border-purple-100 pointer-events-auto text-center space-y-4 flex flex-col items-center ${
              isAlerting 
                ? "left-full top-1/2 -translate-y-1/2 ml-[250px]" 
                : "bottom-full mb-6 left-1/2 -translate-x-1/2"
            }`}
          >
            <div className="bg-purple-100 text-[#A172FD] p-2.5 rounded-2xl">
              <Bell className="h-6 w-6 animate-swing" />
            </div>
            
            <p className="text-sm font-bold text-gray-700 leading-relaxed">
              {alert.message}
            </p>

            <div className="flex flex-col gap-2 w-full">
              {alert.type === "water" && alert.amountMl && (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => handleLogWater(alert.amountMl!)}
                    className="flex-1 flex items-center justify-center gap-1 bg-[#A172FD] text-white py-2 rounded-xl text-xs font-bold hover:bg-[#8b5cf6] transition-colors shadow-sm cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Đã uống
                  </button>
                  <button
                    onClick={() => setAlert(null)}
                    className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    Đóng
                  </button>
                </div>
              )}
              
              {alert.type === "meal-estimate" && alert.portions && alert.mealId && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {alert.portions.map((port, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleEstimateMeal(alert.mealId!, port.label, port.value)}
                        className="w-full bg-[#F5F3FF] hover:bg-[#EAE5FF] text-[#A172FD] py-2.5 px-3 rounded-xl text-xs font-bold transition-all border border-purple-100 text-center whitespace-normal break-words active:scale-98 shadow-sm cursor-pointer"
                      >
                        {port.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setAlert(null)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                </div>
              )}

              {alert.type === "meal-estimate-loading" && (
                <div className="flex items-center justify-center py-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#A172FD] border-t-transparent" />
                </div>
              )}
              
              {alert.type !== "water" && alert.type !== "meal-estimate" && alert.type !== "meal-estimate-loading" && (
                <button
                  onClick={() => setAlert(null)}
                  className="w-full flex items-center justify-center gap-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Đóng
                </button>
              )}
            </div>
            {/* Arrow pointer */}
            <div className={
              isAlerting 
                ? "absolute right-full top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-l border-b border-purple-100 rotate-45 -mr-2"
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
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-yellow-300/40 pointer-events-none"
              style={{
                width: STAR_SIZE,
                height: STAR_SIZE,
                left: 0,
                top: 0,
                zIndex: 42,
              }}
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{
                opacity: [0.8, 0],
                scale: [1, 4.5],
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
          {[...Array(12)].map((_, i) => {
            const angle = (i * 360) / 12;
            const radian = (angle * Math.PI) / 180;
            const distance = 260; // slightly wider particle circle to match 4.2x scale
            const tx = Math.cos(radian) * distance;
            const ty = Math.sin(radian) * distance;
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1.8, 1.2, 0],
                  x: [0, tx * 1.2, tx],
                  y: [0, ty * 1.2, ty],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  delay: (i % 3) * 0.4,
                  ease: "easeOut",
                }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-yellow-300 text-3xl font-bold"
                style={{ zIndex: 45 }}
              >
                ✨
              </motion.div>
            );
          })}
        </>
      )}

      {/* Star button */}
      <motion.button
        id="tour-chatbot-star"
        type="button"
        aria-label="Open chatbot"
        className="pointer-events-auto cursor-grab active:cursor-grabbing outline-none"
        style={{ width: STAR_SIZE, height: STAR_SIZE, touchAction: "none" }}
        animate={isAlerting ? {
          scale: [3.8, 4.2, 3.8],
          rotate: [0, 360],
          filter: [
            "drop-shadow(0 0 35px rgba(253, 224, 71, 0.9))",
            "drop-shadow(0 0 80px rgba(253, 224, 71, 1))",
            "drop-shadow(0 0 35px rgba(253, 224, 71, 0.9))"
          ]
        } : {
          scale: 1,
          rotate: 0,
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.08))"
        }}
        transition={isAlerting ? {
          rotate: { repeat: Infinity, duration: 3, ease: "linear" },
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
          if (Math.abs(e.clientX - p.startX) > 4 || Math.abs(e.clientY - p.startY) > 4) p.moved = true;
          setPosition(clamp(e.clientX - p.offsetX, e.clientY - p.offsetY));
        }}
        onPointerUp={(e) => {
          if (isAlerting) return;
          const p = pointerRef.current;
          if (p.pointerId !== e.pointerId) return;
          e.currentTarget.releasePointerCapture(e.pointerId);
          if (!p.moved && onClick) onClick();
          p.pointerId = -1;
        }}
      >
        <Image
          src="/chatbot-star.png"
          alt="Star chatbot"
          width={STAR_SIZE}
          height={STAR_SIZE}
          priority
          className="h-full w-full object-contain select-none pointer-events-none"
        />
      </motion.button>
    </motion.div>
    </>
  );
}
