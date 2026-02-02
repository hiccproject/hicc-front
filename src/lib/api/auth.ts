import { buildApiUrl } from "@/lib/api/config";
import { extractTokens, setTokens, TokenPair } from "@/lib/auth/tokens";

export type LoginPayload = {
  loginId: string;
  password: string;
};

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
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
  const res = await fetch(buildApiUrl("/api/members/password-reset"), {
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
    const message = data?.message ?? "비밀번호 재설정에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

export async function requestGoogleLogin() {
  window.location.href = buildApiUrl("/api/v1/auth/login");
}

export async function agreeGoogleSignup(payload: TokenPair & { agreed: boolean }) {
  const res = await fetch(buildApiUrl("/api/v1/auth/sign-up/agree"), {
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
    const message = data?.message ?? "구글 회원가입 동의 처리에 실패했습니다.";
    throw new Error(message);
  }

  return data;
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
  if (!res.ok) {
    const message = data?.message ?? "구글 로그인에 실패했습니다.";
    throw new Error(message);
  }

  const tokens = extractTokens(data);
  setTokens(tokens);
  return data;
}
