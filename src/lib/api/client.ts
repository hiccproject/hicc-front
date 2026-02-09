// src/lib/api/client.ts
import { logout } from "@/lib/auth/utils";
import { buildApiUrl } from "@/lib/api/config";
import { extractTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/tokens";

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
  skipAuthRefresh?: boolean;
};

// ✅ 동시 refresh 방지 (single-flight)
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    logout();
    return false;
  }

  const res = await fetch(buildApiUrl("/api/auth/reissue"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!res.ok) {
    logout();
    return false;
  }

  const data = await res.json().catch(() => null);
  const tokens = extractTokens(data);
  if (!tokens.accessToken) {
    logout();
    return false;
  }

  setTokens(tokens);
  return true;
}

// ✅ refresh를 한 번만 실행하게 래핑
function ensureRefreshOnce() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = false, headers, skipAuthRefresh = false, ...rest } = options;

  const token = getAccessToken();

  // ✅ GET 등에 Content-Type 강제하지 않기 (body 있을 때만)
  const hasBody = rest.body !== undefined && rest.body !== null;
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;

  const requestHeaders: Record<string, string> = {
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string> | undefined),
  };

  let res = await fetch(buildApiUrl(url), {
    ...rest,
    headers: requestHeaders,
    credentials: "include",
    cache: "no-store",
  });

  // ✅ 여기: 401뿐 아니라 403도 refresh 대상으로 처리
  if ((res.status === 401 || res.status === 403) && auth && !skipAuthRefresh) {
    const refreshed = await ensureRefreshOnce();

    if (refreshed) {
      const nextToken = getAccessToken();

      res = await fetch(buildApiUrl(url), {
        ...rest,
        headers: {
          ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
          ...(nextToken ? { Authorization: `Bearer ${nextToken}` } : {}),
          ...(headers as Record<string, string> | undefined),
        },
        credentials: "include",
        cache: "no-store",
      });
    } else {
      // refresh 실패 시에는 여기서도 명확히 로그아웃
      logout();
    }
  }

  // refresh 재시도 후에도 401/403이면 로그아웃 처리(토큰 꼬임 방지)
  if ((res.status === 401 || res.status === 403) && auth) {
    logout();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API Error ${res.status}: ${text || res.statusText}`);
  }

  const text = await res.text().catch(() => "");
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
