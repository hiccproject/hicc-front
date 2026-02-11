// src/lib/api/auth.ts

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
  return res.json().catch(() => null);
}

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
    const message = data?.message ?? "로그인에 실패했습니다.";
    throw new Error(message);
  }

  // 일반 로그인에서는 응답에 토큰이 올 수 있으므로 처리
  const tokens = extractTokens(data);
  setTokens(tokens);

  return data;
}

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
   비밀번호 관련
======================= */

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
    const message = error instanceof Error ? error.message : "";
    const isNotFound =
      message.includes("API Error 404") || message.includes("C007");
    if (!isNotFound) throw error;
  }

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

export async function deleteMemberAccount(): Promise<DeleteAccountResponse> {
  return apiFetch<DeleteAccountResponse>("/api/mypage/delete", {
    method: "DELETE",
    auth: true,
  });
}

/* =======================
   Google OAuth
======================= */

export const GOOGLE_LOGIN_URL =
  "https://api.onepageme.kr/oauth2/authorization/google";

/**
 * 구글 로그인 시작
 * - fetch ❌
 * - 이동 ⭕
 * - 성공/신규 분기는 백엔드 리다이렉트가 처리
 */
export function requestGoogleLogin() {
  if (typeof window === "undefined") return;
  window.location.assign(GOOGLE_LOGIN_URL);
}

export type GoogleConsentRequest = {
  personalInfoAgreement: boolean;
  serviceTermsAgreement: boolean;
};

export type GoogleConsentResponse = {
  redirectUrl: string;
  message: string;
};

/**
 * 신규 유저 약관 동의
 * - 백엔드가 신규 유저 상태를 세션/쿠키로 식별
 */
export async function agreeGoogleSignup(
  payload: GoogleConsentRequest
): Promise<GoogleConsentResponse> {
  return apiFetch<GoogleConsentResponse>(
    "/api/auth/sign-up/agree", // buildApiUrl은 apiFetch 내부에서 처리되므로 경로만 작성
    {
      method: "POST",
      auth: true, 
      body: JSON.stringify(payload),
      // apiFetch가 credentials와 cache 설정을 내부에서 관리하므로 중복 코드는 삭제 가능
    }
  );
}

