// src/lib/api/auth.ts
//
// 목적
// - 인증/계정 관련 API들을 한 곳에 모아 관리
// - 일반 로그인/회원가입, 마이페이지 조회, 비밀번호 변경/재설정, 회원탈퇴, 구글 OAuth 진입/약관동의까지 담당
//
// 이 파일에서 중요한 설계 포인트
// 1) apiFetch(자동 refresh 포함)와 직접 fetch를 혼용하고 있음
//    - getMyPage, changeMemberPassword, deleteMemberAccount, consentGoogleSignup은 apiFetch 사용
//    - loginMember, signupMember, resetMemberPassword는 직접 fetch 사용
//    - 혼용 자체가 틀린 건 아니지만, "토큰 만료/에러 포맷" 처리 일관성이 깨질 수 있음
// 2) loginMember에서 tokens를 추출해 localStorage에 저장(setTokens)
//    - 이후 apiFetch(auth:true) 호출에서 Authorization Bearer가 붙도록 하는 핵심
// 3) resetMemberPassword에서 accessToken을 붙이도록 되어 있음
//    - 비밀번호 재설정 정책은 보통 "메일 인증코드로만" 처리하기도 해서,
//      실제 백엔드 명세가 accessToken을 요구하는지 확인이 필요함(요구하지 않으면 헤더는 있어도 무방)
// 4) changeMemberPassword는 엔드포인트가 두 가지 가능성을 가정하고 fallback 처리
//    - /api/mypage/password 를 우선 시도 후 404/C007이면 /api/members/password 로 재시도
//    - 백엔드 경로가 흔들리거나 구버전/신버전 공존 가능성에 대응한 구현

import { buildApiUrl } from "@/lib/api/config";
import { apiFetch } from "@/lib/api/client";
import { extractTokens, getAccessToken, setTokens } from "@/lib/auth/tokens";

/* =======================
   일반 로그인 / 회원가입
======================= */

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  termsAgreed: boolean;
};

async function parseJsonSafe(res: Response) {
  // 응답이 JSON이 아닐 가능성(서버 오류, 빈 응답 등)에서 런타임 크래시 방지
  // 다만 백엔드가 text/plain을 주는 경우에는 여기서 null이 되어 message 추출이 어려울 수 있음
  return res.json().catch(() => null);
}

/**
 * loginMember
 *
 * 동작:
 * 1) /api/members/login에 이메일/비번으로 로그인 요청
 * 2) 성공하면 응답에서 accessToken/refreshToken을 extractTokens로 추출
 * 3) setTokens로 localStorage에 저장하여 이후 인증 요청(apiFetch auth:true)에 사용
 *
 * 왜 apiFetch를 안 쓰고 fetch를 쓰는가?
 * - 로그인은 "토큰이 없을 수 있는 시작점"이라 auth/refresh 처리가 필요 없고,
 * - 응답에서 토큰을 저장하는 특수 처리가 필요해서 분리 구현한 것으로 해석 가능
 * - 다만 apiFetch를 써도 되는 케이스이며, 일관성 차원에서는 apiFetch로 통일해도 무방
 */
export async function loginMember(payload: LoginPayload) {
  const res = await fetch(buildApiUrl("/api/members/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    // 백엔드가 { message } 형태로 내려준다고 가정
    // 만약 text/plain 오류라면 data가 null일 수 있으므로 기본 문구로 fallback
    const message = data?.message ?? "로그인에 실패했습니다.";
    throw new Error(message);
  }

  // 백엔드 응답이 래핑 형태가 달라도 최대한 토큰을 추출
  const tokens = extractTokens(data);

  // 추출한 토큰 저장
  // 이후 apiFetch(auth:true) 사용 시 Authorization 헤더 자동 부착
  setTokens(tokens);

  return data;
}

/**
 * signupMember
 *
 * 동작:
 * - /api/members/signup으로 회원가입 요청
 * - 성공/실패 메시지 처리
 *
 * 토큰 저장을 하지 않는 이유:
 * - 회원가입 직후 자동 로그인 정책이 아니라면 토큰이 내려오지 않을 수 있음
 * - 명세/정책에 따라 회원가입 후 별도 로그인 유도
 */
export async function signupMember(payload: SignupPayload) {
  const res = await fetch(buildApiUrl("/api/members/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const message = data?.message ?? "회원가입에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

/* =======================
   마이페이지 (GET /api/mypage)
======================= */

export type MyPageResponse = {
  name: string;
  email: string;
  picture: string | null;
  role: string;
};

/**
 * getMyPage
 *
 * 동작:
 * - /api/mypage를 auth:true로 호출
 * - apiFetch를 사용하므로 토큰 자동 첨부 + 401/403이면 refresh 후 재시도
 *
 * 주석의 "래핑 없이 바로 형태"를 신뢰하고 MyPageResponse를 그대로 반환하도록 설계
 */
export async function getMyPage(): Promise<MyPageResponse> {
  return apiFetch<MyPageResponse>("/api/mypage", {
    method: "GET",
    auth: true,
  });
}

/* =======================
   비밀번호 관련
======================= */

/**
 * resetMemberPassword
 *
 * 용도:
 * - 이메일 + 인증코드 + 새 비밀번호로 비밀번호 재설정
 *
 * 구현 검토 포인트(중요):
 * - 이 API가 accessToken을 반드시 요구하는지 확인 필요
 *   1) 일반적으로 "비로그인 상태"에서도 코드 기반 재설정이 가능하도록 설계하는 경우가 많음
 *   2) 하지만 정책상 로그인 필요로 만들 수도 있음
 * - 현재 구현은 accessToken이 있으면 붙이고, 없으면 안 붙이는 구조라서
 *   어느 정책이든 "호환"은 되지만, 서버가 반드시 요구하면 비로그인 재설정이 실패할 수 있음
 */
export async function resetMemberPassword(payload: {
  email: string;
  code: string;
  newPassword: string;
}) {
  const accessToken = getAccessToken();

  const res = await fetch(buildApiUrl("/api/members/password-reset"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const message = data?.message ?? "비밀번호 재설정에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

/**
 * changeMemberPassword
 *
 * 동작:
 * 1) /api/mypage/password 로 PATCH 시도
 * 2) 404 또는 C007(리소스 없음) 형태면 /api/members/password 로 fallback
 *
 * 왜 이렇게 구현했는가?
 * - 백엔드에서 "마이페이지 하위"와 "멤버 하위"로 엔드포인트가 바뀌었거나
 * - 배포/브랜치에 따라 경로가 달라지는 상황을 흡수하기 위한 호환성 코드
 *
 * 구현 검토 포인트:
 * - 404는 진짜 리소스 없음뿐 아니라 "Method 매핑 없음" 등으로도 발생할 수 있음
 * - 여기서는 "404/C007이면 fallback"이라는 정책을 택함
 * - 장기적으로는 백엔드와 경로를 하나로 확정하는 것이 가장 이상적
 */
export async function changeMemberPassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    return await apiFetch<{ redirectUrl?: string; message?: string }>(
      "/api/mypage/password",
      {
        method: "PATCH",
        auth: true,
        body: JSON.stringify(payload),
      }
    );
  } catch (error) {
    // apiFetch는 실패 시 Error("API Error <status>: <text>") 형태를 던짐
    // 여기서는 문자열 매칭으로 404/C007 여부를 판정
    // 구조적으로는 "status를 별도로 전달"하면 더 안전하지만 현재 apiFetch 시그니처 상 메시지 파싱으로 처리
    const message = error instanceof Error ? error.message : "";
    const isNotFound = message.includes("API Error 404") || message.includes("C007");
    if (!isNotFound) throw error;
  }

  // fallback 엔드포인트
  return apiFetch<{ redirectUrl?: string; message?: string }>(
    "/api/members/password",
    {
      method: "PATCH",
      auth: true,
      body: JSON.stringify(payload),
    }
  );
}

/* =======================
   회원 탈퇴
======================= */

export type DeleteAccountResponse = {
  redirectUrl?: string;
  message?: string;
};

export type MyPageMutationResponse = {
  redirectUrl?: string;
  message?: string;
};

export async function updateMyPageName(
  name: string
): Promise<MyPageMutationResponse> {
  const query = new URLSearchParams({ name }).toString();
  return apiFetch<MyPageMutationResponse>(`/api/mypage/update?${query}`, {
    method: "POST",
    auth: true,
  });
}

export async function updateMyPageProfile(
  file: File
): Promise<MyPageMutationResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<MyPageMutationResponse>("/api/mypage/profile", {
    method: "POST",
    auth: true,
    body: formData,
  });
}

/**
 * deleteMemberAccount
 *
 * 동작:
 * - /api/mypage/delete DELETE 호출
 * - auth:true 이므로 토큰 자동 첨부 + refresh 가능
 *
 * 구현 검토 포인트:
 * - 탈퇴 후에는 프론트 캐시(토큰/프로필) 정리가 필요하므로
 *   호출부에서 logout()을 수행하는 흐름이 자연스러움
 */
export async function deleteMemberAccount(): Promise<DeleteAccountResponse> {
  return apiFetch<DeleteAccountResponse>("/api/mypage/delete", {
    method: "DELETE",
    auth: true,
  });
}

/* =======================
   Google OAuth
======================= */

/**
 * GOOGLE_LOGIN_URL
 *
 * 구글 OAuth 시작 URL을 상수로 고정
 *
 * 구현 검토 포인트(중요):
 * - 하드코딩 대신 환경변수(NEXT_PUBLIC_API_BASE_URL) 기반으로 구성하면
 *   dev/staging/prod 환경에서 더 안전함
 * - 현재는 프로덕션 도메인으로 고정되어 있어 로컬/스테이징에서 혼동 가능
 */
export const GOOGLE_LOGIN_URL =
  "https://api.onepageme.kr/oauth2/authorization/google";

/**
 * requestGoogleLogin
 *
 * 동작:
 * - 브라우저에서 OAuth 시작 URL로 이동(리다이렉트)
 * - SSR에서는 window가 없으므로 실행하지 않음
 *
 * 구현 이유:
 * - OAuth는 보통 서버가 302로 구글 인증 페이지로 보내야 하므로
 *   fetch로 호출하는 게 아니라 location 이동 방식이 일반적
 */
export function requestGoogleLogin() {
  if (typeof window === "undefined") return;
  window.location.assign(GOOGLE_LOGIN_URL);
}

export type GoogleConsentRequest = {
  name: string;
  personalInfoAgreement: boolean;
  serviceTermsAgreement: boolean;
};

export type GoogleConsentResponse = {
  redirectUrl: string;
  message: string;
};

/**
 * consentGoogleSignup
 *
 * 동작:
 * - 구글 로그인 후 추가 약관/이름 동의 절차가 필요한 경우 호출
 * - auth:true: 이미 OAuth 흐름에서 토큰이 세팅되어 있어야 호출 가능하다는 전제
 *
 * 구현 검토 포인트:
 * - 엔드포인트 "/api/signup/consent"가 실제 백엔드 명세와 정확히 일치하는지 확인 필요
 */
export async function consentGoogleSignup(
  payload: GoogleConsentRequest
): Promise<GoogleConsentResponse> {
  return apiFetch<GoogleConsentResponse>("/api/signup/consent", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}
