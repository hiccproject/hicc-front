const DEFAULT_API_BASE_URL = "https://api.onepageme.kr";

function normalizeBaseUrl(url: string) {
  // 끝의 / 제거
  return url.replace(/\/+$/, "");
}

function fixWrongBaseUrl(url: string) {
  const normalized = normalizeBaseUrl(url);

  // 프론트 도메인으로 잘못 넣었으면 API 도메인으로 강제 교정
  if (
    normalized === "https://onepageme.kr" ||
    normalized === "https://www.onepageme.kr" ||
    normalized === "http://onepageme.kr" ||
    normalized === "http://www.onepageme.kr"
  ) {
    return DEFAULT_API_BASE_URL;
  }

  return normalized;
}

export const API_BASE_URL = fixWrongBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
);

export function buildApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path}`;
}
