import { buildApiUrl } from "@/lib/api/config";

async function readResponseBody(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function sendVerificationMail(email: string) {
  const query = new URLSearchParams({ email });
  const res = await fetch(buildApiUrl(`/api/mail/send?${query.toString()}`), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await readResponseBody(res);
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? (data as { message?: string }).message
        : undefined;
    throw new Error(message ?? "이메일 인증 코드 발송에 실패했습니다.");
  }

  return data;
}

export async function verifyMailCode(email: string, code: string) {
  const query = new URLSearchParams({ email, code });
  const res = await fetch(buildApiUrl(`/api/mail/verify?${query.toString()}`), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await readResponseBody(res);
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? (data as { message?: string }).message
        : undefined;
    throw new Error(message ?? "이메일 인증에 실패했습니다.");
  }

  return data;
}
