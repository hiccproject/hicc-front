export type TokenPair = {
  accessToken?: string;
  refreshToken?: string;
};

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

export function setTokens(tokens: TokenPair) {
  if (typeof window === "undefined") return;
  if (tokens.accessToken) {
    localStorage.setItem("accessToken", tokens.accessToken);
  }
  if (tokens.refreshToken) {
    localStorage.setItem("refreshToken", tokens.refreshToken);
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export function extractTokens(payload: unknown): TokenPair {
  if (!payload || typeof payload !== "object") return {};

  const containers = [
    payload,
    (payload as Record<string, unknown>).data,
    (payload as Record<string, unknown>).result,
    (payload as Record<string, unknown>).token,
    (payload as Record<string, unknown>).tokens,
  ];

  for (const container of containers) {
    if (!container || typeof container !== "object") continue;
    const record = container as Record<string, unknown>;
    const accessToken = record.accessToken as string | undefined;
    const refreshToken = record.refreshToken as string | undefined;
    if (accessToken || refreshToken) {
      return { accessToken, refreshToken };
    }
  }

  return {};
}
