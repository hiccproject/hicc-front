export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://onepageme.kr";

export function buildApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path}`;
}
