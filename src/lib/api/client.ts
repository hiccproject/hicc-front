// src/lib/api/client.ts
// 목적
// - fetch 공통 래퍼: API_BASE_URL 결합, 헤더 구성, 에러 파싱
// - auth 요청 시 accessToken 자동 첨부
// - 401/403 발생 시 refresh 후 재시도
// - 동시에 여러 요청이 만료될 때 refresh 중복 호출 방지(single-flight)
// - refresh 실패 또는 재시도 후에도 실패 시 토큰 꼬임 방지를 위해 logout

import { logout } from "@/lib/auth/utils";
import { buildApiUrl } from "@/lib/api/config";
import { extractTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/tokens";

type ApiFetchOptions = RequestInit & {
  // auth=true면 Authorization: Bearer <accessToken>을 붙인다.
  // 인증이 필요 없는 공개 API는 false로 두는 게 기본.
  auth?: boolean;

  // refresh 재귀/무한루프를 피하기 위한 옵션.
  // 예: refresh 엔드포인트 호출 자체가 401/403을 내면 다시 refresh를 부르며 루프가 날 수 있는데,
  // 그런 경우를 막기 위해 내부 refresh 호출에는 skipAuthRefresh를 true로 줄 수도 있다.
  skipAuthRefresh?: boolean;
};

// refreshPromise
// - 여러 API 호출이 동시에 401/403을 받으면 refresh를 여러 번 때리는 상황이 생긴다.
// - 첫 refresh를 시작한 Promise를 공유해서 나머지는 그 결과만 기다리게 한다(single-flight).
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken() {
  // refresh 토큰을 로컬 저장소에서 꺼내서 재발급 요청에 사용
  const refreshToken = getRefreshToken();

  // refreshToken이 없으면 재발급 불가 → 인증 상태가 유효하지 않으므로 로그아웃
  if (!refreshToken) {
    logout();
    return false;
  }

  // /api/auth/reissue 호출
  // 중요한 포인트:
  // - credentials: "include"를 쓰는 이유는 백엔드가 쿠키 기반 세션/리프레시를 병행할 수도 있기 때문.
  //   (지금은 body에 refreshToken도 보내지만, 쿠키와 병행일 수 있으니 include 유지)
  const res = await fetch(buildApiUrl("/api/auth/reissue"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  // 재발급 실패(만료/위조/서버 오류 등)면 로그아웃
  if (!res.ok) {
    logout();
    return false;
  }

  // 응답 파싱 후 토큰 추출
  const data = await res.json().catch(() => null);
  const tokens = extractTokens(data);

  // accessToken이 없으면 정상 재발급으로 볼 수 없으니 로그아웃
  if (!tokens.accessToken) {
    logout();
    return false;
  }

  // 새 토큰 저장
  // 여기서 refreshToken이 같이 오면 갱신될 수 있으니 setTokens는 둘 다 저장하도록 둔다.
  setTokens(tokens);

  return true;
}

function ensureRefreshOnce() {
  // 이미 refresh 중이면 기존 Promise를 반환
  // 새로 만들지 않으므로 refresh 중복 호출 방지
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      // 완료 후 null로 되돌려 다음 만료 시 다시 refresh 가능하게 함
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = false, headers, skipAuthRefresh = false, ...rest } = options;

  // 요청 직전 accessToken을 읽는다.
  // 이유: refresh 이후 재요청 시 최신 토큰이 들어가야 하고,
  //       token을 전역 상수처럼 잡아두면 갱신된 토큰이 반영되지 않을 수 있다.
  const token = getAccessToken();

  // Content-Type 강제 설정 로직
  // - body가 없는 GET 등에 Content-Type을 억지로 넣지 않기
  // - FormData는 브라우저가 boundary 포함한 Content-Type을 자동으로 설정하므로 직접 지정하면 깨질 수 있다.
  const hasBody = rest.body !== undefined && rest.body !== null;
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;

  // 헤더 구성 우선순위
  // - 기본 헤더(Content-Type/Authorization)
  // - 호출자가 넘긴 headers는 마지막에 병합해 override 가능하도록 둔다.
  //   (다만 Authorization을 외부에서 덮어쓰는 케이스는 지양)
  const requestHeaders: Record<string, string> = {
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string> | undefined),
  };

  // 1차 요청
  let res = await fetch(buildApiUrl(url), {
    ...rest,
    headers: requestHeaders,
    credentials: "include",
    cache: "no-store",
  });

  // 401/403 처리
  // - 401: 인증 필요/만료
  // - 403: 백엔드 구현에 따라 만료/권한 거부를 403으로 주는 경우가 있어서 같이 refresh 대상으로 둠
  // 중요: "권한이 없어서 403"인 경우까지 refresh를 시도할 수 있는데,
  //       이 경우 refresh는 성공해도 재시도 결과가 다시 403일 수 있다. 아래 로직이 그 상황을 정상 처리한다.
  if ((res.status === 401 || res.status === 403) && auth && !skipAuthRefresh) {
    const refreshed = await ensureRefreshOnce();

    if (refreshed) {
      // refresh 성공 후 최신 토큰으로 재시도
      const nextToken = getAccessToken();

      res = await fetch(buildApiUrl(url), {
        ...rest,
        headers: {
          ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
          ...(nextToken ? { Authorization: `Bearer ${nextToken}` } : {}),
          ...(headers as Record<string, string> | undefined),
        },
        credentials: "include",
        cache: "no-store",
      });
    } else {
      // refresh 실패면 즉시 로그아웃
      logout();
    }
  }

  // 재시도 후에도 401/403이면 토큰 상태가 꼬였거나 만료/차단된 상태로 보고 로그아웃
  // 이유: 계속 실패하는 토큰을 들고 다음 요청에서도 동일 문제가 반복되는 것을 차단(무한 루프/무한 재시도 방지)
  if ((res.status === 401 || res.status === 403) && auth) {
    logout();
  }

  // 에러 응답 처리
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API Error ${res.status}: ${text || res.statusText}`);
  }

  // 응답 파싱
  // - 빈 body는 {}로 반환
  // - JSON이면 JSON 파싱
  // - JSON이 아니면 text 그대로 반환(다운로드/단순 문자열 응답 대비)
  const text = await res.text().catch(() => "");
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}