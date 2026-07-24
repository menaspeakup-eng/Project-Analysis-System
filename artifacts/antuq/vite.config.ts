import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const rawPort = process.env.PORT || "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,

  plugins: [
    react(),
    tailwindcss({
      optimize: true,
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },

  root: path.resolve(import.meta.dirname),



  build: {
  outDir: path.resolve(import.meta.dirname, "dist/public"),
  emptyOutDir: true,

  assetsInlineLimit: 0,

  rollupOptions: {
    output: {
      assetFileNames: (assetInfo) => {
        if (
          assetInfo.name?.endsWith(".png") ||
          assetInfo.name?.endsWith(".jpg") ||
          assetInfo.name?.endsWith(".jpeg") ||
          assetInfo.name?.endsWith(".webp")
        ) {
          return "assets/[name][extname]";
        }

        return "assets/[name]-[hash][extname]";
      },
    },
  },
},




  

  server: {
    host: "0.0.0.0",
    port,
    strictPort: true,

    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
