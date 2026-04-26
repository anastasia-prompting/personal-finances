import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Личный финансовый AI-аудитор",
        short_name: "Фин-аудитор",
        description: "Локальный учёт и мягкое планирование",
        start_url: "/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#0ea5e9",
        lang: "ru",
        orientation: "portrait",
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"] },
    }),
  ],
});
