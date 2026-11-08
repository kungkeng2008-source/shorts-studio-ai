import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative asset paths let the same build work at the GitHub Pages project URL
// and at a root-domain deployment such as Cloudflare Pages.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { host: "0.0.0.0" },
});
