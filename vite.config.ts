import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  vite: {
    plugins: [nitro()],
  },
  tanstackStart: {
    server: {
      entry: "server",
    },
  },
});