const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;

export function formatNetworkError(error) {
  if (!(error instanceof Error)) {
    return "网络请求失败，请检查链接或网络后重试。";
  }

  const message = error.message.toLowerCase();
  const cause =
    error.cause instanceof Error ? error.cause.message.toLowerCase() : String(error.cause ?? "").toLowerCase();
  const combined = `${message} ${cause}`;

  if (combined.includes("abort") || combined.includes("timeout") || combined.includes("timed out")) {
    return "请求超时，目标网站响应过慢，请稍后重试。";
  }

  if (
    combined.includes("fetch failed") ||
    combined.includes("econnreset") ||
    combined.includes("enotfound") ||
    combined.includes("econnrefused") ||
    combined.includes("certificate") ||
    combined.includes("tls") ||
    combined.includes("socket")
  ) {
    return "无法连接目标网站，请检查网络或稍后重试。";
  }

  return error.message || "网络请求失败，请检查链接或网络后重试。";
}

export async function fetchHtml(urlString, options = {}) {
  const {
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(urlString, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const html = await response.text();
      return { response, html, error: null };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  return { response: null, html: "", error: lastError };
}
