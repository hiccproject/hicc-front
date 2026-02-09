// src/lib/auth/utils.ts (새로 생성하거나 기존 auth 파일에 추가)
import { clearTokens } from "@/lib/auth/tokens";
import { clearStoredProfile } from "@/lib/auth/profile";

export function logout() {
  clearTokens();        // 토큰 삭제
  clearStoredProfile(); // 프로필 삭제 (화면상 로그인 상태 해제)
}