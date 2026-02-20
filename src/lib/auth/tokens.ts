// src/lib/auth/tokens.ts
// 목적
// - accessToken / refreshToken을 localStorage에 저장 및 조회
// - SSR 환경(Next.js)에서 window 접근 에러 방지
// - 백엔드 응답 포맷이 달라도 토큰을 최대한 유연하게 추출(extractTokens)
// - refresh 로직(apiFetch)과 결합되어 인증 흐름의 핵심 역할 수행

export type TokenPair = {
  accessToken?: string;
  refreshToken?: string;
};

// localStorage에 저장할 key 상수
// 문자열 하드코딩 방지 + 오타 방지 목적
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

/**
 * getAccessToken
 * - 브라우저 환경에서 accessToken을 조회
 * - SSR에서는 window가 없으므로 null 반환
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * getRefreshToken
 * - refreshToken 조회
 * - refreshAccessToken()에서 사용됨
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * setTokens
 * - accessToken / refreshToken을 각각 조건부로 저장
 *
 * 중요한 설계 포인트:
 * - 둘 중 하나만 내려오는 경우도 있으므로 각각 따로 저장
 * - undefined면 기존 값 유지 (덮어쓰지 않음)
 *
 * 보안 관점:
 * - localStorage는 XSS 공격에 취약
 * - 실무에서는 HttpOnly 쿠키 기반 토큰 전략이 더 안전
 * - 현재 구조는 SPA + API 서버 조합에서 흔히 쓰는 방식이지만,
 *   XSS 방어가 매우 중요함 (CSP, input sanitize 등)
 */
export function setTokens(tokens: TokenPair) {
  if (typeof window === "undefined") return;

  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }

  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

/**
 * clearTokens
 * - 로그아웃 시 호출
 * - access/refresh 둘 다 제거
 *
 * 중요:
 * - 토큰만 지우고 profile 같은 다른 캐시는 남아있을 수 있음
 * - 정책에 따라 clearStoredProfile()도 같이 호출하는 게 자연스러울 수 있음
 */
export function clearTokens() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * extractTokens
 *
 * 목적:
 * - 백엔드 응답 구조가 일정하지 않아도
 *   accessToken / refreshToken을 최대한 찾아서 반환
 *
 * 지원 예:
 *  - { accessToken, refreshToken }
 *  - { data: { accessToken, refreshToken } }
 *  - { result: { accessToken, refreshToken } }
 *  - { data: { data: { accessToken, refreshToken } } }
 *
 * 왜 이렇게 구현했는가?
 * - 백엔드 팀이 응답 래핑 구조를 변경하거나
 * - 공통 ResponseWrapper를 사용하는 경우
 * - 또는 OAuth 로그인과 일반 로그인 응답 포맷이 다를 수 있음
 *
 * 이 함수는 "유연성"을 우선한 설계.
 */
export function extractTokens(payload: unknown): TokenPair {
  // payload가 객체가 아니면 토큰 추출 불가
  if (!payload || typeof payload !== "object") return {};

  const p = payload as Record<string, unknown>;

  /**
   * 탐색할 컨테이너 후보들
   *
   * 순서 의미:
   * - 가장 바깥 객체
   * - data
   * - result
   * - data.data
   * - result.data
   *
   * 일부 백엔드에서 이중 래핑을 사용하는 경우를 대비
   */
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

    // 둘 중 하나라도 발견되면 반환
    // 이유:
    // - refresh 응답이 accessToken만 줄 수도 있음
    // - 로그인 응답이 refreshToken만 갱신할 수도 있음
    if (accessToken || refreshToken) {
      return { accessToken, refreshToken };
    }
  }

  // 못 찾으면 빈 객체 반환
  return {};
}