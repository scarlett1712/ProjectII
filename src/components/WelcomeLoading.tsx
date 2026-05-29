"use client";

import { motion } from "framer-motion";

export function WelcomeLoading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#9BA4FF] via-[#A172FD] to-[#FF9BE2]">
      {/* Animated background stars */}
      <div className="absolute inset-0 opacity-40">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              scale: 0.5,
              opacity: 0.3,
            }}
            animate={{
              scale: [0.5, 1.2, 0.5],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}
        {/* Larger decorative stars */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`large-${i}`}
            className="absolute h-6 w-6 text-white/20"
            style={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
            }}
            animate={{
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L14.39 8.26H22L15.81 12.74L18.19 20L12 15.5L5.81 20L8.19 12.74L2 8.26H9.61L12 1Z" />
            </svg>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 px-6 text-center"
      >
        <h1 className="mb-4 text-3xl font-bold leading-tight text-white drop-shadow-lg md:text-5xl">
          Chào mừng đến với thế giới của những vì sao!
        </h1>
        <p className="text-xl font-medium text-white/90 drop-shadow-md md:text-2xl">
          Nơi mọi thứ đều đâu vào đấy.
        </p>
      </motion.div>

      {/* Loading indicator */}
      <motion.div
        className="mt-12 h-1 w-48 overflow-hidden rounded-full bg-white/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div
          className="h-full bg-white"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  );
}
