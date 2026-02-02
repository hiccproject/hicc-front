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

async function uploadFile(path: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(buildApiUrl(path), {
    method: "POST",
    credentials: "include",
    body: formData,
    cache: "no-store",
  });

  const data = await readResponseBody(res);
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? (data as { message?: string }).message
        : undefined;
    throw new Error(message ?? "파일 업로드에 실패했습니다.");
  }

  return data;
}

export async function uploadImage(file: File) {
  return uploadFile("/api/images/upload", file);
}

export async function uploadS3Test(file: File) {
  return uploadFile("/s3/upload", file);
}
