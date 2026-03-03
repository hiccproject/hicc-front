const SERVER_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = 256 * 1024;

// 서버 제한(10MB)이 request body 기준인 경우를 대비해 multipart 오버헤드를 버퍼로 차감
export const MAX_IMAGE_FILE_SIZE_BYTES =
  SERVER_UPLOAD_LIMIT_BYTES - MULTIPART_OVERHEAD_BYTES;

export const IMAGE_FILE_TOO_LARGE_MESSAGE =
  "이미지 용량이 너무 큽니다. 10MB 이하 이미지를 업로드해주세요.";

export function isPayloadTooLargeApiError(message: string) {
  return message.includes("API Error 413") || /payload too large/i.test(message);
}

export function isLikelyPayloadTooLargeError(_file: File, message: string) {
  return (
    isPayloadTooLargeApiError(message) ||
    /failed to fetch/i.test(message)
  );
}
