"use client";

import React from "react";

export function StarBackground({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundImage: "url('/bg-stars.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
