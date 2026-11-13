"use client";

import React from "react";

export function StarBackground({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="relative min-h-[100dvh] h-[100dvh] w-full overflow-hidden"
      style={{
        backgroundImage: "url('/bg-stars.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}
