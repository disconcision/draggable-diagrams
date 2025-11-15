import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { qrcodePlugin } from "./vite-plugin-qrcode";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), qrcodePlugin()],
  define: {
    "process.env": {},
  },
});
