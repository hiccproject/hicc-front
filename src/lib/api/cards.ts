import type { Card } from "@/types/card";
// import { apiFetch } from "@/lib/api/client";

export type HomeCardsResponse = {
  myCard: Card | null; // 로그인 시 우선 노출
  cards: Card[];       // 공개/전체 랜덤 카드들
};

function isLoggedInByToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("accessToken");
}

/**
 * ✅ 메인 페이지 랜덤 명함 영역에서 필요한 데이터
 * - 명함 API가 아직 미정이므로: 지금은 MOCK로 반환
 * - 백엔드 확정되면: 아래 REAL API 섹션으로 교체 (이 파일만 변경)
 */
export async function getHomeCards(limit = 6): Promise<HomeCardsResponse> {
  // -------------------------------
  // MOCK 데이터 (지금 당장 UI 개발용)
  // -------------------------------
  const mockMyCard: Card = {
    id: "me",
    name: "내 명함",
    role: "Frontend (Next.js)",
    intro: "포트폴리오를 한 페이지로",
  };

  const mockPool: Card[] = [
    { id: "c1", name: "정원", role: "Designer", intro: "UI/UX 중심" },
    { id: "c2", name: "제정모", role: "Backend Engineer", intro: "API/DB 설계" },
    { id: "c3", name: "박준호", role: "Product Manager", intro: "문제 정의/실행" },
    { id: "c4", name: "최서연", role: "iOS Developer", intro: "앱 경험 최적화" },
    { id: "c5", name: "김하늘", role: "Data Analyst", intro: "데이터 기반" },
    { id: "c6", name: "오지훈", role: "DevOps", intro: "배포 자동화" },
    { id: "c7", name: "김민서", role: "Frontend Developer", intro: "React/TS" },
    { id: "c8", name: "배현주", role: "Backend Engineer", intro: "API/DB 설계" },
    { id: "c9", name: "김민수", role: "Frontend Developer", intro: "React/TS" }
  ];

  const shuffled = [...mockPool].sort(() => Math.random() - 0.5).slice(0, limit);

  return {
    myCard: isLoggedInByToken() ? mockMyCard : null,
    cards: shuffled,
  };

  // -------------------------------
  // REAL API 교체 예시
  // -------------------------------
  // A안) 분리형
  // const cards = await apiFetch<Card[]>(`/api/cards/random?limit=${limit}`);
  // let myCard: Card | null = null;
  // try {
  //   myCard = await apiFetch<Card>(`/api/cards/me`, { auth: true });
  // } catch {
  //   myCard = null;
  // }
  // return { myCard, cards };
  //
  // B안) 통합형
  // return apiFetch<HomeCardsResponse>(`/api/home/cards?limit=${limit}`, { auth: true });
}
