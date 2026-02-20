// (예: src/lib/api/mail.ts 등 파일명은 프로젝트에 맞게 유지)
// 목적
// - 이메일 인증코드 발송 / 검증 API 호출
// - 백엔드가 text/plain을 보내거나, JSON 문자열을 보내는 등 응답 포맷이 흔들려도 안전하게 처리
// - 네트워크가 멈출 때 무한 대기하지 않도록 timeout(AbortController) 적용
// - 실패 시 가능한 한 백엔드의 에러 메시지를 그대로 보여주도록 추출 로직 포함

import { buildApiUrl } from "@/lib/api/config";

// AnyJson: object 형태 데이터에서 message 같은 필드를 꺼내기 위한 최소 타입
type AnyJson = Record<string, unknown>;

function isObject(v: unknown): v is AnyJson {
  // null도 typeof === "object" 이므로 null 제외가 중요하다.
  return typeof v === "object" && v !== null;
}

async function readResponseBody(res: Response) {
  // Response body는 한 번만 읽을 수 있으므로(text/json 둘 중 하나) text로 먼저 읽는다.
  // 이유:
  // - 백엔드가 content-type을 text/plain으로 주면서 실제 내용은 JSON 문자열인 경우가 있을 수 있음
  // - 혹은 명세대로 단순 문자열("OK" 같은)을 주는 경우도 있으므로 통일된 처리 필요
  const text = await res.text().catch(() => "");
  if (!text) return null;

  // JSON 형태면 파싱해서 object/array로 반환
  // 파싱 실패면 단순 문자열 응답으로 보고 text를 그대로 반환
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(data: unknown) {
  // 에러 메시지를 사용자에게 최대한 정확하게 보여주기 위한 메시지 추출기
  // 1) 응답이 문자열이면 그대로 메시지로 사용 (스택트레이스/에러문구 포함 가능)
  // 2) 응답이 객체면 message 필드 우선 사용
  if (!data) return undefined;
  if (typeof data === "string") return data;
  if (isObject(data)) {
    const msg = data["message"];
    if (typeof msg === "string") return msg;
  }
  return undefined;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15000) {
  // AbortController로 네트워크 요청 제한 시간 구현
  // 이유:
  // - fetch는 기본적으로 타임아웃이 없어서 서버/네트워크 문제 시 영원히 pending일 수 있음
  // - UX 관점에서 인증 메일 발송 같은 기능은 적당한 시간(예: 15초) 내 실패 처리 필요
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    // 성공/실패/abort 어떤 경우든 타이머는 정리되어야 메모리/타이머 누수 방지
    clearTimeout(timer);
  }
}

export async function sendVerificationMail(email: string) {
  // query string 구성 시 URLSearchParams를 사용하면 인코딩 실수를 줄일 수 있다.
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
    // 백엔드가 text로 스택트레이스를 내려주는 경우라도 최대한 그대로 노출
    const message = extractMessage(data);
    throw new Error(message ?? `이메일 인증 코드 발송에 실패했습니다. (${res.status})`);
  }

  // 성공 응답이 문자열이면 문자열 그대로, JSON이면 JSON 그대로 리턴
  // 호출부(UI)에서 성공 메시지를 다양하게 처리 가능
  return data;
}

export async function verifyMailCode(email: string, code: string) {
  const query = new URLSearchParams({ email, code });

  const res = await fetchWithTimeout(
    buildApiUrl(`/api/mail/verify?${query.toString()}`),
    {
      // 구현 검토 포인트:
      // - "검증"도 서버 입장에서는 상태 변경(인증 확정/세션 부여 등)이 있을 수 있어 POST가 흔하지만
      // - 백엔드 명세가 GET이면 프론트는 동일하게 맞춘다.
      // - 마찬가지로 cache: "no-store"로 캐싱 방지
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