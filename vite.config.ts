import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // mathjax-full's components/version.js falls back to eval('require') unless
  // PACKAGE_VERSION is defined, which breaks in the browser/ESM build.
  define: {
    PACKAGE_VERSION: JSON.stringify("3.2.1"),
  },
});
