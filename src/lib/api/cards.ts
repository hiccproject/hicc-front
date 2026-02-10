import type { Card } from "@/types/card";
import { apiFetch } from "@/lib/api/client";
import { MOCK_PORTFOLIOS } from "@/mock/portfolios"; // [NEW] 상세 포트폴리오 Mock Import

// 랜덤 명함 조회 응답 타입
export type HomeCardsResponse = {
  myCard: Card | null;
  cards: Card[];
};

function isPublicCard(card: Card) {
  if (card.status && card.status !== "PUBLISHED") return false;
  if (card.isPublic === false) return false;
  return true;
}

// API 응답 타입 정의 (내 명함 조회용)
type PortfolioItem = {
  id: number;
  title: string | null;
  profileImg: string | null;
  status: "DRAFT" | "PUBLISHED";
  lastStep: number;
  updatedAt: string;
};

/**
 * 안전하게 토큰 가져오기 (SSR 이슈 방지)
 */
function getSafeToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

// 내 포트폴리오 ID와 상태를 조회하는 함수
export async function getRecentPortfolioId(): Promise<{ id: number; status: string; lastStep: number } | null> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (!token) return null;

  try {
    // 내 명함 목록 조회
    const res = await fetch("/api/portfolios/my", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const list: any[] = Array.isArray(json) ? json : json.data || [];

    if (list.length === 0) return null;

    // 1. DRAFT(작성 중) 상태 우선 검색
    const draft = list.find((item) => item.status === "DRAFT");
    if (draft) {
      return { id: draft.id, status: draft.status, lastStep: draft.lastStep || 1 };
    }

    // 2. DRAFT가 없다면 최신 PUBLISHED 명함 ID 반환 (수정 모드 대비)
    // 날짜 내림차순 정렬
    const sorted = list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (sorted.length > 0) {
      const latest = sorted[0];
      return { id: latest.id, status: latest.status, lastStep: latest.lastStep || 5 };
    }

    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
}
/**
 * '내 명함' 선정 로직
 * 1. 토큰이 없으면 API 호출 안 함 (null 반환)
 * 2. API 호출 성공 시:
 * - DRAFT 상태 중 가장 최신 것 우선
 * - 없으면 PUBLISHED 상태 중 가장 최신 것
 * 3. 실패하거나 데이터 없으면 null
 */
export async function fetchMyCard(): Promise<Card | null> {
  try {
    // ✅ auth:true로 호출하면 Authorization 자동 + 401/403면 refresh 시도
    const json = await apiFetch<any>("/api/portfolios/my", {
      method: "GET",
      auth: true,
    });

    const list: PortfolioItem[] = Array.isArray(json) ? json : json.data || [];
    if (list.length === 0) return null;

    const sortedList = list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const draftCard = sortedList.find((item) => item.status === "DRAFT");
    const publishedCard = sortedList.find((item) => item.status === "PUBLISHED");
    const selected = draftCard || publishedCard;
    if (!selected) return null;

    let name = selected.title || "제목 없음";
    let role = "Role";

    if (name === "null - null") {
      name = "작성 중인 명함";
      role = "미정";
    } else if (name.includes(" - ")) {
      const parts = name.split(" - ");
      if (parts.length >= 2) {
        name = parts[0];
        role = parts[1];
      }
    }

    return {
      id: selected.id.toString(),
      name,
      role,
      intro: selected.status === "DRAFT" ? "이어서 작성하기" : "포트폴리오 보러가기",
      profileImage: selected.profileImg || undefined,
    };
  } catch (e) {
    console.error("Failed to fetch my card:", e);
    return null;
  }
}

/**
 * 홈 화면 카드 조회
 */
export async function getHomeCards(limit = 6): Promise<HomeCardsResponse> {
  // 1. 내 명함 가져오기 (API 연동, 실패 시 null)
  const myCard = await fetchMyCard();

  // 2. 상세 포트폴리오 Mock 데이터를 Card 타입으로 변환 (배경 카드용)
  const mockCards: Card[] = MOCK_PORTFOLIOS.map((portfolio) => ({
    id: portfolio.id.toString(),
    name: portfolio.name, 
    role: portfolio.subCategory, // subCategory -> role 매핑
    intro: portfolio.summaryIntro || "자기소개가 없습니다.",
    profileImage: portfolio.profileImg || undefined,
    projects: portfolio.projects, // 프로젝트 정보 포함
    status: portfolio.status,
  }));

  // 3. 랜덤 셔플 및 개수 제한
  const shuffled = [...mockCards]
    .filter(isPublicCard)
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);

  return {
    myCard,
    cards: shuffled,
  };
}

// --- [추가 기능] 명함 생성 API 연결 ---

export type PortfolioCategory =
  | "DEVELOPMENT"
  | "DESIGN"
  | "MARKETING"
  | "PLANNING"
  | "BUSINESS"
  | "MANAGEMENT"
  | "FINANCE"
  | "SERVICE"
  | "ENGINEERING"
  | "MEDIA"
  | "MEDICAL"
  | "OTHERS";

export type PortfolioData = {
  category: PortfolioCategory;
  subCategory: string;
  profileImg?: string;
  email: string;
  phone?: string;
  location?: string;

  projects: {
    projectName: string;
    projectSummary: string;
    projectLink?: string;
    projectImg?: string;
  }[];
  summaryIntro: string;
  tags?: string[];
  layoutType: "CARD" | "LIST" | "GRID";
};

export type PortfolioDetailData = {
  id: number;
  category: PortfolioCategory;
  subCategory: string;
  profileImg?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  projects?: {
    projectName?: string;
    projectSummary?: string;
    projectLink?: string;
    projectImg?: string;
  }[];
  summaryIntro?: string | null;
  tags?: string[];
  layoutType?: "CARD" | "LIST" | "GRID";
};

/**
 * 단계별 포트폴리오 저장 함수
 * @param step 현재 단계 (1~5)
 * @param body 해당 단계의 데이터
 * @param portfolioId 1단계 이후부터 필수인 ID
 */
export async function savePortfolioStep(step: number, body: any, portfolioId?: number | null) {
  const params = new URLSearchParams({ step: step.toString() });

  // ✅ falsy 체크로 누락되지 않게
  if (portfolioId !== null && portfolioId !== undefined) {
    params.append("portfolioId", portfolioId.toString());
  }

  return apiFetch<{ data: number }>(`/api/portfolios/save?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify(body),
    auth: true,
  });
}

export async function getPortfolioShareLink(portfolioId: number) {
  return apiFetch<{ data: string }>(`/api/portfolios/${portfolioId}/share-link`, {
    method: "GET",
    auth: true,
  });
}

export async function getPortfolioDetail(slug: string) {
  const normalizedSlug = slug
    .trim()
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
    .pop();

  if (!normalizedSlug) {
    throw new Error("유효한 포트폴리오 슬러그가 없습니다.");
  }

  return apiFetch<{ data: PortfolioDetailData }>(`/api/portfolios/${encodeURIComponent(normalizedSlug)}`, {
    method: "GET",
    auth: true,
  });
}

export async function deletePortfolio(portfolioId: number) {
  return apiFetch(`/api/portfolios/${portfolioId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function updatePortfolioStatus(
  portfolioId: number,
  status: "DRAFT" | "PUBLISHED"
) {
  return apiFetch(`/api/portfolios/${portfolioId}/status`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ status }),
  });
}
