import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The app and the class service share an origin in production, so the dev server proxies
 * /api rather than the client carrying a second base URL that only exists in development.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4173,
    strictPort: true,
    proxy: { "/api": { target: `http://127.0.0.1:${process.env.BOW_API_PORT ?? 4180}`, changeOrigin: true } },
  },
  preview: {
    port: 4174,
    strictPort: true,
    proxy: { "/api": { target: `http://127.0.0.1:${process.env.BOW_API_PORT ?? 4180}`, changeOrigin: true } },
  },
});
