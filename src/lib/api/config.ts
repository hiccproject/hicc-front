// src/lib/config.ts
// 이 파일은 API 서버의 Base URL을 안전하게 관리하기 위한 설정 파일이다.
// - 환경변수 기반 API URL 설정
// - 잘못된 도메인 입력 자동 교정
// - 중복 슬래시 제거
// - 절대 URL/상대 URL 분기 처리
// -> Vercel 환경에서 환경변수 오입력 방지
/**
 * 기본 API 서버 주소
 * - 환경변수가 없거나 잘못 설정되었을 경우 fallback으로 사용
 */
const DEFAULT_API_BASE_URL = "https://api.onepageme.kr";

/**
 * normalizeBaseUrl
 * - URL 끝에 붙어 있는 불필요한 "/" 제거
 * - 예: https://api.onepageme.kr/ → https://api.onepageme.kr
 * - 중복 슬래시로 인한 URL 오류 방지 목적
 */
function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

/**
 * fixWrongBaseUrl
 * - 프론트 도메인(onepageme.kr)을 API_BASE_URL로 잘못 설정했을 경우 자동 교정
 * - 실제 API는 api.onepageme.kr 이므로 강제 변환
 * - 배포 환경에서 환경변수 실수 방지 목적
 */
function fixWrongBaseUrl(url: string) {
  const normalized = normalizeBaseUrl(url);

  // 프론트 도메인을 API 도메인으로 교정
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

/**
 * API_BASE_URL
 * - NEXT_PUBLIC_API_BASE_URL 환경변수 우선 사용
 * - 없으면 DEFAULT_API_BASE_URL 사용
 * - 잘못된 값이면 fixWrongBaseUrl로 교정
 */
export const API_BASE_URL = fixWrongBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
);

/**
 * buildApiUrl
 * - API 요청 시 사용할 최종 URL 생성 함수
 *
 * 동작 방식:
 * 1. 이미 절대 URL(http/https)이라면 그대로 반환
 * 2. 상대 경로(/api/...)라면 API_BASE_URL을 앞에 붙여 반환
 *
 * 목적:
 * - 코드에서 상대 경로만 작성해도 자동으로 API 서버 주소가 붙도록 하기 위함
 */
export function buildApiUrl(path: string) {
  // 이미 절대 URL이면 그대로 반환
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // 상대 경로면 API_BASE_URL과 결합
  return `${API_BASE_URL}${path}`;
}