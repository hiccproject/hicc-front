// src/lib/auth/tokens.ts

export type TokenPair = {
  accessToken?: string;
  refreshToken?: string;
};

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: TokenPair) {
  if (typeof window === "undefined") return;

  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * 백엔드 응답이 어떤 래핑 형태로 오든 access/refresh 토큰을 최대한 뽑아낸다.
 * 지원 예:
 *  - { accessToken, refreshToken }
 *  - { data: { accessToken, refreshToken } }
 *  - { result: { accessToken, refreshToken } }
 *  - { data: { data: { accessToken, refreshToken } } } 같은 중첩도 일부 커버
 */
export function extractTokens(payload: unknown): TokenPair {
  if (!payload || typeof payload !== "object") return {};

  const p = payload as Record<string, unknown>;

  // 흔한 컨테이너들을 순서대로 탐색
  const containers: unknown[] = [
    p,
    p.data,
    p.result,
    (p.data as any)?.data,
    (p.result as any)?.data,
  ];

  for (const c of containers) {
    if (!c || typeof c !== "object") continue;
    const obj = c as Record<string, unknown>;

    const accessToken =
      typeof obj.accessToken === "string" ? obj.accessToken : undefined;
    const refreshToken =
      typeof obj.refreshToken === "string" ? obj.refreshToken : undefined;

    if (accessToken || refreshToken) {
      return { accessToken, refreshToken };
    }
  }

  return {};
}
