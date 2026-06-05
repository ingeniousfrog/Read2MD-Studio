export function formatImportErrorMessage(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (
    normalized === "fetch failed" ||
    normalized === "failed to fetch" ||
    normalized.includes("load failed")
  ) {
    return "无法连接抓取服务，请确认已运行 npm run dev，并稍后重试。";
  }

  if (normalized.includes("networkerror") || normalized.includes("network request failed")) {
    return "网络异常，请检查连接后重试。";
  }

  return message;
}
