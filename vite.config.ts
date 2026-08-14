import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { siteUrlFromEnvironment } from "./src/lib/site.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const deploymentEnvironment = { ...env, ...process.env };
  const siteUrl = siteUrlFromEnvironment(deploymentEnvironment);
  if (
    (deploymentEnvironment.SITE_URL || deploymentEnvironment.VERCEL_PROJECT_PRODUCTION_URL) &&
    !siteUrl
  ) {
    throw new Error("The deployment URL must be a valid HTTP(S) URL");
  }
  let base = "/";

  if (siteUrl) {
    try {
      const pathname = new URL(siteUrl).pathname.replace(/\/+$/, "");
      base = pathname ? `${pathname}/` : "/";
    } catch {
      throw new Error("SITE_URL must be an absolute HTTP(S) URL");
    }
  }

  return {
    base,
    define: {
      "import.meta.env.VITE_SITE_URL": JSON.stringify(siteUrl ?? ""),
    },
    plugins: [react(), tailwindcss()],
    build: { manifest: true },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: { port: 5181 },
  };
});
