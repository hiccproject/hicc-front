import type { Card } from "@/types/card";
import { apiFetch } from "@/lib/api/client";
import { MOCK_PORTFOLIOS } from "@/mock/portfolios"; // [NEW] 상세 포트폴리오 Mock Import

// 랜덤 명함 조회 응답 타입
export type HomeCardsResponse = {
  myCard: Card | null;
  cards: Card[];
};

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

/**
 * '내 명함' 선정 로직
 * 1. 토큰이 없으면 API 호출 안 함 (null 반환)
 * 2. API 호출 성공 시:
 * - DRAFT 상태 중 가장 최신 것 우선
 * - 없으면 PUBLISHED 상태 중 가장 최신 것
 * 3. 실패하거나 데이터 없으면 null
 */
async function fetchMyCard(): Promise<Card | null> {
  const token = getSafeToken();
  
  // [핵심 수정] 토큰이 없으면 아예 API를 호출하지 않음 -> 인증 오류 방지
  if (!token) return null;

  try {
    const res = await fetch("/api/portfolios/my", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    // 401(Unauthorized) 등의 에러 발생 시 로그아웃 처리된 것으로 간주하고 null 반환
    if (!res.ok) return null;

    const json = await res.json();
    const list: PortfolioItem[] = Array.isArray(json) ? json : json.data || [];

    if (list.length === 0) return null;

    // 날짜 내림차순 정렬 (최신순)
    const sortedList = list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // 우선순위 선정: DRAFT > PUBLISHED
    const draftCard = sortedList.find((item) => item.status === "DRAFT");
    const publishedCard = sortedList.find((item) => item.status === "PUBLISHED");
    
    const selected = draftCard || publishedCard;

    if (!selected) return null;

    // Card 타입으로 변환
    let name = selected.title || "제목 없음";
    let role = "Role";
    
    // "null - null" 혹은 "이름 - 직무" 파싱 처리
    if (name === "null - null") {
        name = "작성 중인 명함";
        role = "미정";
    } else if (name && name.includes(" - ")) {
        const parts = name.split(" - ");
        if (parts.length >= 2) {
            name = parts[0];
            role = parts[1];
        }
    }

    return {
      id: selected.id.toString(),
      name: name,
      role: role,
      intro: selected.status === "DRAFT" ? "이어서 작성하기" : "포트폴리오 보러가기",
      profileImage: selected.profileImg || undefined,
      // DRAFT 상태 여부 등을 구분해야 한다면 별도 필드 추가 가능
    };

  } catch (error) {
    // 네트워크 오류 등이 나도 화면 전체가 깨지지 않도록 null 반환
    console.error("Failed to fetch my card silently:", error);
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
  }));

  // 3. 랜덤 셔플 및 개수 제한
  const shuffled = [...mockCards]
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);

  return {
    myCard,
    cards: shuffled,
  };
}

// --- 포트폴리오 생성 관련 함수 (기존 유지) ---

export async function savePortfolioStep(
  step: number,
  body: any,
  portfolioId?: number | null
) {
  const params = new URLSearchParams({ step: step.toString() });
  if (portfolioId) {
    params.append("portfolioId", portfolioId.toString());
  }

  return apiFetch<{ data: number }>(`/api/portfolios?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify(body),
    auth: true, 
  });
}