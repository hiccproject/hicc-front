import { buildApiUrl } from "@/lib/api/config";
import { apiFetch } from "@/lib/api/client";

import { extractTokens, getAccessToken, setTokens } from "@/lib/auth/tokens";

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

export type SignupInfo = {
  email: string;
  name?: string;
  tempUserKey?: string;
};

const SUCCESS_RESPONSE_CODE = "SUCCESS";

async function parseJsonSafe(res: Response) {
  return res.json().catch(() => null);
}

export async function loginMember(payload: LoginPayload) {
  const res = await fetch(buildApiUrl("/api/members/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const message = data?.message ?? "로그인에 실패했습니다.";
    throw new Error(message);
  }

  const tokens = extractTokens(data);
  setTokens(tokens);
  return data;
}

export async function signupMember(payload: SignupPayload) {
  const res = await fetch(buildApiUrl("/api/members/signup"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
  const accessToken = getAccessToken();
  const res = await fetch(buildApiUrl("/api/members/password"), {
    method: "PATCH",
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
    const message = data?.message ?? "비밀번호 변경에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

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

export async function fetchSignupInfo(): Promise<SignupInfo> {
  const accessToken = getAccessToken();
  const res = await fetch(buildApiUrl("/api/signup/info"), {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) throw new Error("signup info 조회 실패");

  const json = await res.json();
  const email = json?.data?.email ?? json?.email ?? "";
  const name = json?.data?.name ?? json?.name ?? undefined;
  const tempUserKey = json?.data?.tempUserKey ?? json?.tempUserKey ?? undefined;

  return { email, name, tempUserKey };
}

export const GOOGLE_LOGIN_URL = "https://api.onepageme.kr/oauth2/authorization/google";
/**
 * 구글 로그인 시작: 백엔드 OAuth 시작 URL로 이동
 * 백엔드가 로그인 성공 후
 * - 기존 유저면 https://www.onepageme.kr/
 * - 신규 유저면 https://www.onepageme.kr/terms
 * 로 리다이렉트해줌
 */
/** 구글 로그인 시작: 백엔드 OAuth 시작 URL로 이동 */
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
 * 신규 유저 약관 동의 처리
 * - 백엔드가 신규 유저 상태를 세션/쿠키로 식별하는 경우가 많아서 credentials: "include" 권장
 * - accessToken이 없을 수 있으니 auth 헤더 강제 부착은 피하는 게 안전
 */
export async function agreeGoogleSignup(
  payload: GoogleConsentRequest
): Promise<GoogleConsentResponse> {
  return apiFetch<GoogleConsentResponse>(buildApiUrl("/api/auth/google/consent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
    cache: "no-store",
  });
}