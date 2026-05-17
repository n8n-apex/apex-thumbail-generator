import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    headers: {
      // iframe-Embedding (LearnWorlds, Notion, etc.) erlauben
      "Content-Security-Policy": "frame-ancestors *",
      "X-Frame-Options": "ALLOWALL",
    },
  },
  preview: {
    host: "::",
    port: 8080,
    headers: {
      "Content-Security-Policy": "frame-ancestors *",
      "X-Frame-Options": "ALLOWALL",
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
