import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Lets the dev server be opened through an ngrok tunnel for phone testing.
    allowedHosts: [".ngrok-free.app", ".ngrok.app", ".ngrok.io"],
  },
});
