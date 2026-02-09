import { buildApiUrl } from "@/lib/api/config";

type AnyJson = Record<string, unknown>;

function isObject(v: unknown): v is AnyJson {
  return typeof v === "object" && v !== null;
}

async function readResponseBody(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return null;

  // 백엔드가 text/plain으로 주지만 내용이 JSON 문자열일 수도 있으니 시도
  try {
    return JSON.parse(text);
  } catch {
    return text; // ✅ 명세처럼 "문자열"이면 그대로 반환
  }
}

function extractMessage(data: unknown) {
  if (!data) return undefined;
  if (typeof data === "string") return data; // ✅ 스택트레이스/에러문구도 그대로
  if (isObject(data)) {
    const msg = data["message"];
    if (typeof msg === "string") return msg;
  }
  return undefined;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendVerificationMail(email: string) {
  const query = new URLSearchParams({ email });

  const res = await fetchWithTimeout(
    buildApiUrl(`/api/mail/send?${query.toString()}`),
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
    15000
  );

  const data = await readResponseBody(res);

  if (!res.ok) {
    // ✅ 백엔드가 text로 스택트레이스 내려줘도 그대로 노출되게
    const message = extractMessage(data);
    throw new Error(message ?? `이메일 인증 코드 발송에 실패했습니다. (${res.status})`);
  }

  // ✅ 성공 응답이 문자열이면 문자열 그대로, JSON이면 JSON 그대로 리턴
  return data;
}

export async function verifyMailCode(email: string, code: string) {
  const query = new URLSearchParams({ email, code });

  const res = await fetchWithTimeout(
    buildApiUrl(`/api/mail/verify?${query.toString()}`),
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
    15000
  );

  const data = await readResponseBody(res);

  if (!res.ok) {
    const message = extractMessage(data);
    throw new Error(message ?? `이메일 인증에 실패했습니다. (${res.status})`);
  }

  return data;
}
