// src/lib/api/portfolio-layout.ts
// 목적
// - 포트폴리오 레이아웃 타입(CARD / LIST / GRID)을 저장하는 전용 API 호출 함수
// - 명세상 step=5 저장 단계에서 layoutType을 업데이트
// - 일부 환경에서 메서드 불일치(POST vs PATCH) 가능성을 고려해 fallback 처리
// apiFetch, budldUrl로 다시 작성 필요

import { buildApiUrl } from "@/lib/api/config";
import { getAccessToken } from "@/lib/auth/tokens";

export type LayoutType = "CARD" | "LIST" | "GRID";

/**
 * parseJsonSafe
 * - 응답이 JSON이 아닐 경우에도 앱이 죽지 않도록 안전 파싱
 * - 백엔드가 204(No Content)나 text/plain을 반환할 가능성 대비
 */
async function parseJsonSafe(res: Response) {
  return res.json().catch(() => null);
}

/**
 * 저장 API (명세 기준)
 * POST https://api.onepageme.kr/api/portfolios/save?portfolioId=63002&step=5
 * body: { "layoutType": "LIST" }
 *
 * step=5는 포트폴리오 생성 플로우의 마지막 단계로 보이며
 * 해당 단계에서 레이아웃 타입을 저장하는 역할
 */
export async function savePortfolioLayoutType(
  portfolioId: number,
  layoutType: LayoutType
) {
  // accessToken 직접 조회
  // 중요:
  // 현재 프로젝트에는 apiFetch가 존재하지만,
  // 여기서는 refresh 로직을 사용하지 않는 "단순 fetch" 방식으로 구현되어 있음.
  // 만약 토큰 만료 상황까지 자동 처리하려면 apiFetch(auth: true)를 사용하는 것이 더 일관적.
  const accessToken = getAccessToken();

  // URL 구성
  // portfolioId는 숫자지만 안전하게 문자열로 변환 후 encodeURIComponent 처리
  // (이 케이스에서는 실제로는 숫자라 encode가 크게 필요하진 않지만
  //  query string 조합 시 일관성 유지 목적)
  const url = buildApiUrl(
    `/api/portfolios/save?portfolioId=${encodeURIComponent(
      String(portfolioId)
    )}&step=5`
  );

  // 요청 body 구성
  const body = JSON.stringify({ layoutType });

  /**
   * 1차 시도: POST
   *
   * 왜 POST인가?
   * - 명세상 "저장(save)" API
   * - 생성/업데이트 혼합 save 패턴에서 보통 POST 사용
   */
  let res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",

      // accessToken이 존재하면 Authorization 헤더 추가
      // 없으면 헤더 생략
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: "include",
    body,
    cache: "no-store",
  });

  /**
   * 404 fallback 처리
   *
   * 왜 404일 때 PATCH 재시도하는가?
   *
   * 일부 백엔드 구현에서:
   * - POST 매핑이 없고
   * - PATCH로만 업데이트 허용하는 경우
   *
   * 즉, API 명세와 실제 컨트롤러 매핑이 어긋나 있을 가능성 대응
   *
   * 주의:
   * 404는 "리소스 없음"이지만,
   * Spring 등에서 특정 HTTP Method에 매핑이 없을 때도 404가 나오는 경우가 있음.
   */
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

  /**
   * 에러 처리
   *
   * 백엔드 응답 구조가:
   * {
   *   code: "...",
   *   message: "...",
   *   data: ...
   * }
   *
   * 혹은
   * {
   *   error: "..."
   * }
   *
   * 일 수 있으므로 message → error 순으로 우선 추출
   */
  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      `레이아웃 저장 실패 (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return data;
}