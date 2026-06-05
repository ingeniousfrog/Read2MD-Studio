import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function importProxyPlugin(): Plugin {
  return {
    name: "import-proxy",
    configureServer(server) {
      server.middlewares.use("/api/import-url", async (request, response, next) => {
        if (request.method !== "GET") {
          next();
          return;
        }

        try {
          // @ts-expect-error Local ESM helper ships without generated declaration file.
          const { fetchImportUrl } = (await import("./server/importUrl.mjs")) as {
            fetchImportUrl: (url: string) => Promise<{
              ok: boolean;
              kind: "wechat" | "generic" | null;
              reason: "invalid-url" | "verification" | "network" | null;
              message: string;
              status: number;
              html: string;
              verification: boolean;
            }>;
          };
          const requestUrl = new URL(request.url ?? "", "http://localhost");
          const articleUrl = requestUrl.searchParams.get("url");

          if (!articleUrl) {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ ok: false, message: "缺少 url 参数。" }));
            return;
          }

          const result = await fetchImportUrl(articleUrl);
          response.statusCode = result.ok ? 200 : 502;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              ok: result.ok,
              html: result.html,
              kind: result.kind,
              verification: result.verification,
              reason: result.reason,
              message: result.message,
              status: result.status,
            }),
          );
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              ok: false,
              message: error instanceof Error ? error.message : "服务器内部错误",
            }),
          );
        }
      });

      server.middlewares.use("/api/import-wechat", async (request, response, next) => {
        if (request.method !== "GET") {
          next();
          return;
        }

        try {
          // @ts-expect-error Local ESM helper ships without generated declaration file.
          const { fetchWechatHtml } = (await import("./server/wechatFetch.mjs")) as {
            fetchWechatHtml: (url: string) => Promise<{
              ok: boolean;
              reason: "invalid-url" | "verification" | "network" | null;
              message: string;
              status: number;
              html: string;
              verification: boolean;
            }>;
          };
          const requestUrl = new URL(request.url ?? "", "http://localhost");
          const articleUrl = requestUrl.searchParams.get("url");

          if (!articleUrl) {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ ok: false, message: "缺少 url 参数。" }));
            return;
          }

          const result = await fetchWechatHtml(articleUrl);
          response.statusCode = result.ok ? 200 : 502;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              ok: result.ok,
              html: result.html,
              kind: "wechat",
              verification: result.verification,
              reason: result.reason,
              message: result.message,
              status: result.status,
            }),
          );
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              ok: false,
              message: error instanceof Error ? error.message : "服务器内部错误",
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), importProxyPlugin()],
  base: "./",
  define: {
    PACKAGE_VERSION: JSON.stringify("3.2.1"),
  },
});
