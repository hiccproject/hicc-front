import type { Card } from "@/types/card";
import { apiFetch } from "@/lib/api/client";

//랜덤 명함 조회 (더미 데이터 유지) ---
export type HomeCardsResponse = {
  myCard: Card | null;
  cards: Card[];
};

function isLoggedInByToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("accessToken");
}

export async function getHomeCards(limit = 6): Promise<HomeCardsResponse> {
  // MOCK 데이터
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
}

// --- [추가 기능] 명함 생성 API 연결 ---

export type PortfolioData = {
  category: string;
  subCategory: string;
  profileImg?: string;
  email: string;
  phone?: string;
  location?: string;
  projects: { projectName: string; projectSummary: string; projectLink?: string }[];
  summaryIntro: string;
  layoutType: "CARD" | "LIST" | "GRID";
};

/**
 * 단계별 포트폴리오 저장 함수
 * @param step 현재 단계 (1~5)
 * @param body 해당 단계의 데이터
 * @param portfolioId 1단계 이후부터 필수인 ID
 */
export async function savePortfolioStep(
  step: number,
  body: any,
  portfolioId?: number | null
) {
  const params = new URLSearchParams({ step: step.toString() });
  if (portfolioId) {
    params.append("portfolioId", portfolioId.toString());
  }

  // 예: POST /api/portfolios?step=1
  return apiFetch<{ data: number }>(`/api/portfolios?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify(body),
    auth: true, // 토큰 자동 포함
  });
}