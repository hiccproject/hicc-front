// src/lib/api/portfolio-layout.ts
import { buildApiUrl } from "@/lib/api/config";
import { getAccessToken } from "@/lib/auth/tokens";

export type LayoutType = "CARD" | "LIST" | "GRID";

async function parseJsonSafe(res: Response) {
  return res.json().catch(() => null);
}

/**
 * 저장 API (명세)
 * https://api.onepageme.kr/api/portfolios/save?portfolioId=63002&step=5
 * body: { "layoutType": "LIST" }
 */
export async function savePortfolioLayoutType(portfolioId: number, layoutType: LayoutType) {
  const accessToken = getAccessToken();
  const url = buildApiUrl(
    `/api/portfolios/save?portfolioId=${encodeURIComponent(String(portfolioId))}&step=5`
  );

  const body = JSON.stringify({ layoutType });

  // 1) POST 시도
  let res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: "include",
    body,
    cache: "no-store",
  });

  // 404면 메서드가 다른 케이스가 많아서 PATCH로 재시도
  if (res.status === 404) {
    res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: "include",
      body,
      cache: "no-store",
    });
  }

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      `레이아웃 저장 실패 (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return data;
}
