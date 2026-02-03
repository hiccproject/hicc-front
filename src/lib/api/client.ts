import { buildApiUrl } from "@/lib/api/config";
import {
  extractTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth/tokens";

type ApiFetchOptions = RequestInit & {
  auth?: boolean; // true면 Authorization 헤더 자동 첨부
  skipAuthRefresh?: boolean; // true면 401 시 토큰 갱신 시도 안 함
};

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(buildApiUrl("/api/auth/reissue"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!res.ok) return false;

  const data = await res.json().catch(() => null);
  const tokens = extractTokens(data);
  if (!tokens.accessToken) return false;

  setTokens(tokens);
  return true;
}

export async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = false, headers, skipAuthRefresh = false, ...rest } = options;
  const token = getAccessToken();

  const requestHeaders = {
    "Content-Type": "application/json",
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {}),
  };

  let res = await fetch(buildApiUrl(url), {
    ...rest,
    headers: requestHeaders,
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 401 && auth && !skipAuthRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const nextToken = getAccessToken();
      res = await fetch(buildApiUrl(url), {
        ...rest,
        headers: {
          "Content-Type": "application/json",
          ...(nextToken ? { Authorization: `Bearer ${nextToken}` } : {}),
          ...(headers || {}),
        },
        credentials: "include",
        cache: "no-store",
      });
    }
  }


  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API Error ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}
