// src/lib/auth/utils.ts
// 목적
// - 애플리케이션에서 공통으로 사용하는 로그아웃 처리 로직
// - 인증 토큰 제거
// - 프론트 캐시된 사용자 프로필 제거
// - 화면 상 로그인 상태를 즉시 해제하기 위한 최소 동작 수행

import { clearTokens } from "@/lib/auth/tokens";
import { clearStoredProfile } from "@/lib/auth/profile";

/**
 * logout
 *
 * 현재 구현 동작:
 * 1. accessToken / refreshToken 제거
 * 2. 로컬에 저장된 memberProfile 제거
 *
 * 설계 의도:
 * - 인증 상태를 프론트 기준에서 완전히 초기화
 * - 이후 API 호출 시 Authorization 헤더가 붙지 않도록 함
 * - UI에서 getStoredProfile()이 null이 되어 로그인 해제 상태로 전환
 *
 * 중요한 구조적 포인트:
 * - 이 함수는 "서버 로그아웃"을 호출하지 않는다.
 *   즉, 백엔드 세션이나 refresh 쿠키가 있다면 서버에는 그대로 남아있을 수 있음.
 *
 * - 현재 프로젝트는 토큰 기반 인증(localStorage) 구조이므로
 *   프론트 토큰 삭제만으로 사실상 인증은 무효화됨.
 *
 * 개선 가능 지점:
 * - 백엔드에 /logout API가 있다면:
 *   → 서버 측 refresh 토큰 무효화까지 같이 수행하는 것이 더 안전
 *
 * - 로그아웃 후:
 *   → router.push("/login") 같은 리다이렉트는 여기서 하지 않고
 *      UI 레이어에서 제어하는 것이 더 구조적으로 깔끔함
 *
 * - profile name map(memberProfileNameByEmail)은 현재 유지된다.
 *   → 정책에 따라 "완전 로그아웃" 시 name map도 지우는 별도 clear 함수가 필요할 수 있음.
 */
export function logout() {
  clearTokens();        // accessToken / refreshToken 삭제
  clearStoredProfile(); // 화면용 사용자 프로필 캐시 삭제
}