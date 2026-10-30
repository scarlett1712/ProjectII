import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Little Star - Trợ lý cá nhân AI",
    short_name: "Little Star",
    description: "Trợ lý cá nhân đa năng kết hợp AI, theo dõi sức khỏe và tài chính cá nhân",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F5F3FF",
    theme_color: "#A172FD",
    orientation: "portrait",
    icons: [
      {
        src: "/chatbot-star.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/chatbot-star.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
