import { buildApiUrl } from "@/lib/api/config";
import { apiFetch } from "@/lib/api/client";

export type LayoutType = "CARD" | "LIST" | "GRID";

type ApiResponse<T> = {
  code: string;
  message: string;
  data?: T;
};

/**
 * step=5 layout 저장
 * - 서버가 PATCH 매핑이 없으면 404(C007)로 떨어질 수 있어서
 *   PATCH -> (404면) POST fallback
 */
export async function savePortfolioLayoutType(portfolioId: number, layoutType: LayoutType) {
  const url = buildApiUrl(`/api/portfolios?portfolioId=${portfolioId}&step=5`);
  const body = JSON.stringify({ layoutType });

  // 1) PATCH 시도
  try {
    const res = await apiFetch<ApiResponse<number>>(url, {
      method: "PATCH",
      auth: true,
      body,
    });

    if (!res || res.code !== "SUCCESS") {
      throw new Error(res?.message || "레이아웃 저장 실패");
    }
    return res.data ?? null;
  } catch (e: any) {
    // 2) PATCH가 404/C007이면 POST 재시도
    const msg = String(e?.message ?? "");
    const is404 =
      msg.includes("404") ||
      msg.includes("C007") ||
      msg.toLowerCase().includes("not found") ||
      msg.toLowerCase().includes("찾을 수");

    if (!is404) throw e;

    const res2 = await apiFetch<ApiResponse<number>>(url, {
      method: "POST",
      auth: true,
      body,
    });

    if (!res2 || res2.code !== "SUCCESS") {
      throw new Error(res2?.message || "레이아웃 저장 실패");
    }
    return res2.data ?? null;
  }
}
