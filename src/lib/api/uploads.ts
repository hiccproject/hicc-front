// (예: src/lib/api/uploads.ts)
// 목적
// - 이미지(파일) 업로드 API 호출 유틸
// - FormData 업로드 특성(브라우저가 Content-Type을 자동으로 설정)을 지키면서
//   Authorization만 선택적으로 붙여 서버에 전송
// - 백엔드가 JSON 또는 문자열(text/plain)로 응답해도 안전하게 처리
// - 실패 시 가능한 한 백엔드 message를 우선 사용해 에러를 노출
// 얘도 apiFetch로 통합 필요
import { buildApiUrl } from "@/lib/api/config";
import { getAccessToken } from "@/lib/auth/tokens";
import {
  IMAGE_FILE_TOO_LARGE_MESSAGE,
  MAX_IMAGE_FILE_SIZE_BYTES,
  isLikelyPayloadTooLargeError,
} from "@/lib/api/upload-error";

/**
 * readResponseBody
 * - 응답을 text로 먼저 읽고, JSON 파싱을 시도한다.
 * - 이유:
 *   1) 백엔드가 content-type을 text/plain으로 주더라도 내용이 JSON 문자열일 수 있음
 *   2) 성공 응답이 단순 문자열일 수도 있으니, 파싱 실패 시 그대로 반환
 *
 * 주의:
 * - Response body는 한 번만 읽을 수 있으므로(text/json 중복 호출 불가)
 * - 이 함수는 "항상 text로 읽고 필요 시 JSON 파싱"으로 일관 처리한다.
 */
async function readResponseBody(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * uploadFile
 * - 파일 업로드 공통 함수
 * - path에 따라 이미지/문서 등 업로드를 확장할 수 있게 설계
 *
 * 구현 포인트:
 * 1) FormData 사용
 *    - 파일 업로드는 multipart/form-data를 사용해야 함
 * 2) Content-Type을 직접 지정하지 않음
 *    - 브라우저가 boundary 포함한 Content-Type을 자동으로 넣음
 *    - 직접 지정하면 boundary가 누락되어 서버에서 파싱 실패할 수 있음
 * 3) Authorization 헤더는 토큰이 있을 때만 설정
 *    - 공개 업로드/로그인 업로드 정책이 바뀌어도 호출부 로직이 단순해짐
 */
async function uploadFile(path: string, file: File) {
  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    throw new Error(IMAGE_FILE_TOO_LARGE_MESSAGE);
  }

  const formData = new FormData();

  // 서버가 기대하는 multipart key가 "file"이라는 전제
  // 만약 백엔드가 "image" 같은 다른 key를 기대하면 여기서 실패한다.
  // 명세에 key명이 명확히 있다면 그 값으로 고정해야 한다.
  formData.append("file", file);

  // accessToken을 로컬 저장소에서 읽어 Bearer로 전송
  // 중요한 검토 포인트:
  // - 이 구현은 apiFetch(refresh 포함)를 사용하지 않으므로 토큰 만료 시 자동 refresh가 되지 않는다.
  // - 업로드는 사용자가 오래 머문 뒤 실행할 가능성이 높아서, 만료 대응이 필요하면 apiFetch 기반으로 통합하는 게 더 안정적이다.
  const token = getAccessToken();

  let res: Response;
  try {
    res = await fetch(buildApiUrl(path), {
      method: "POST",

      // FormData 업로드에서는 Content-Type을 직접 지정하지 않는다.
      // 여기서는 Authorization만 넣기 위해 headers를 조건부로 구성
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,

      // 쿠키 기반 인증/세션을 병행하는 서버일 수 있어 include 유지
      credentials: "include",

      body: formData,

      // 업로드 요청은 캐시되면 안 되므로 no-store
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isLikelyPayloadTooLargeError(file, message)) {
      throw new Error(IMAGE_FILE_TOO_LARGE_MESSAGE);
    }
    throw error;
  }

  const data = await readResponseBody(res);

  /**
   * 에러 처리
   *
   * - 서버가 JSON 형태로 { message: "..."} 내려주면 message를 우선 사용
   * - 서버가 문자열로 에러를 내려주면 현재 로직에서는 message를 못 뽑는다.
   *
   * 중요 포인트(개선 여지):
   * - data가 문자열인 경우에도 그대로 에러 메시지로 쓰는 편이 디버깅에 유리하다.
   * - 아래 주석의 이유 때문에 지금 구현은 "객체 message만" 우선한다.
   *   (운영에서 스택트레이스/내부 메시지를 그대로 노출하기 싫을 수 있음)
   */
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error(IMAGE_FILE_TOO_LARGE_MESSAGE);
    }

    const message =
      typeof data === "object" && data !== null && "message" in data
        ? (data as { message?: string }).message
        : undefined;

    // message가 없으면 공통 문구로 처리
    throw new Error(message ?? "파일 업로드에 실패했습니다.");
  }

  // 성공 시:
  // - JSON이면 JSON 반환 (예: { url: "..."} 등)
  // - 문자열이면 문자열 반환 (예: 업로드된 URL 문자열)
  return data;
}

/**
 * uploadImage
 * - 이미지 업로드 전용 래퍼
 * - 내부적으로 uploadFile을 재사용하여 구현 중복을 줄임
 */
export async function uploadImage(file: File) {
  return uploadFile("/api/images/upload", file);
}
