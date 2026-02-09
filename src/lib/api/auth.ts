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

export type GoogleLoginTokenResponse = {
  code?: string;
  message?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
  };
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

export async function deleteMemberAccount() {
  return apiFetch("/api/mypage/delete", {
    method: "DELETE",
    auth: true,
  });
}

export async function requestGoogleLogin() {
  const googleAuthStartUrl =
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_START_URL ??
    "https://api.onepageme.kr/oauth2/authorization/google";

  window.location.href = googleAuthStartUrl;
}

export async function exchangeGoogleLoginCode(payload: {
  code: string;
  redirectUri: string;
}) {
  const res = await fetch(buildApiUrl("/api/auth/login/google"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await parseJsonSafe(res)) as GoogleLoginTokenResponse | null;

  if (!res.ok || data?.code !== SUCCESS_RESPONSE_CODE) {
    const message = data?.message ?? "구글 로그인에 실패했습니다.";
    throw new Error(message);
  }

  const tokens = extractTokens(data);
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error("토큰 발급에 실패했습니다.");
  }
  setTokens(tokens);
  return data;
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

export async function agreeGoogleSignup(payload: {
  tempUserKey: string;
  consents: {
    SERVICE_TERMS: boolean;
    PRIVACY_POLICY: boolean;
    MARKETING: boolean;
    SMS_NOTIFICATION: boolean;
    EMAIL_NOTIFICATION: boolean;
  };
  name: string;
}) {
  const res = await fetch(buildApiUrl("/api/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (res.status === 403) {
    const json = await res.json().catch(() => ({}));
    const msg = json?.message ?? "필수 약관에 동의하지 않았습니다.";
    throw new Error(msg);
  }

  if (!res.ok) throw new Error("동의 처리 실패");

  return res.json().catch(() => ({}));
}
