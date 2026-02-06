import { buildApiUrl } from "@/lib/api/config";

import {
  extractTokens,
  getAccessToken,
  setTokens,
  TokenPair,
} from "@/lib/auth/tokens";
const API_BASE = "https://api.onepageme.kr";

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
  const res = await fetch(buildApiUrl("/api/members/password"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
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
  const res = await fetch(buildApiUrl("/api/members"), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    cache: "no-store",
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const message = data?.message ?? "계정 삭제에 실패했습니다.";
    throw new Error(message);
  }

  return data;
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

export async function fetchSignupInfo(): Promise<{ email: string; name?: string }> {
  const accessToken = getAccessToken();
  const res = await fetch(`${API_BASE}/api/signup/info`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: "include", // 필요 없으면 제거
  });

  if (!res.ok) throw new Error("signup info 조회 실패");

  const json = await res.json();
  // 백 응답 포맷에 맞춰 파싱 (예: json.data.email)
  const email = json?.data?.email ?? json?.email ?? "";
  const name = json?.data?.name ?? json?.name ?? undefined;

  return { email, name };
}

export async function loginMemberZeroPassword(email_s: string) {
  const res = await fetch(`${API_BASE}/api/members/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email : email_s, password: "0" }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 서버가 200인데 code로 실패를 주는 타입일 수도 있어서 아래도 같이 방어
    const code = json?.code;
    const message = json?.message ?? "로그인 실패";
    throw new Error(code ? `${code}:${message}` : message);
  }

  // 200인데 code로 실패 주는 경우도 방어
  if (json?.code && json.code !== "SUCCESS" && json.code !== "OK") {
    const code = json.code;
    const message = json?.message ?? "로그인 실패";
    throw new Error(`${code}:${message}`);
  }

  return json;
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
  name: string; // 백이 name 받으면 유지, 아니면 제거
}) {
  const res = await fetch(`${API_BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 403) {
    const json = await res.json().catch(() => ({}));
    const msg = json?.message ?? "필수 약관에 동의하지 않았습니다.";
    throw new Error(msg);
  }

  if (!res.ok) throw new Error("동의 처리 실패");

  return res.json().catch(() => ({}));
}
