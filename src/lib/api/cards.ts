import type { Card } from "@/types/card";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/tokens";
import { getStoredProfile } from "@/lib/auth/profile";
import { buildApiUrl } from "@/lib/api/config";
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
  username?: string | null;
  profileImg: string | null;
  status: "DRAFT" | "PUBLISHED";
  lastStep: number;
  updatedAt: string;
  category?: string | null;
  subCategory?: string | null;
};

type PublicPortfolioListItem = {
  slug: string | null;
  username?: string | null;
  profileImg: string | null;
  categoryTitle: string | null;
  subCategory: string | null;
  tags?: string[];
  updatedAt: string;
  status?: "DRAFT" | "PUBLISHED";
  isPublic?: boolean;
};

type PublicPortfolioListResponse = {
  content: PublicPortfolioListItem[];
  hasNext: boolean;
};

type TitleParts = {
  name: string;
  role: string;
};

function normalizeTitleParts(title?: string | null): TitleParts {
  if (!title || title === "null - null") {
    return { name: "작성 중인 명함", role: "미정" };
  }

  if (title.includes(" - ")) {
    const parts = title.split(" - ");
    if (parts.length >= 2) {
      return { name: parts[0] || "제목 없음", role: parts[1] || "Role" };
    }
  }

  return { name: title || "제목 없음", role: "Role" };
}

function sortByUpdatedDesc(list: PortfolioItem[]) {
  return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

const CATEGORY_LABELS: Record<string, string> = {
  DEVELOPMENT: "IT·개발",
  DESIGN: "디자인",
  MARKETING: "마케팅·광고",
  PLANNING: "기획·전략",
  BUSINESS: "영업·고객상담",
  MANAGEMENT: "경영·인사·총무",
  FINANCE: "금융·재무",
  SERVICE: "서비스·교육",
  ENGINEERING: "엔지니어링·설계",
  MEDIA: "미디어",
  MEDICAL: "의료",
  OTHERS: "기타",
};

function getCategoryLabel(value?: string | null) {
  if (!value) return "";
  return CATEGORY_LABELS[value] || value;
}

function isPublicListItem(item: PublicPortfolioListItem) {
  if (item.status && item.status !== "PUBLISHED") return false;
  if (item.isPublic === false) return false;
  if (!item.slug) return false;
  return true;
}

async function fetchPublicCards(limit: number): Promise<Card[]> {
  try {
    const params = new URLSearchParams();
    params.set("sort", "LATEST");
    params.set("page", "0");
    params.set("size", String(Math.max(limit, 0)));

    const res = await fetch(buildApiUrl(`/api/portfolios/list?${params.toString()}`), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = (await res.json()) as PublicPortfolioListResponse;
    const list = (data?.content ?? []).filter(isPublicListItem);

    const detailed = await Promise.all(
      list.map(async (item) => {
        if (!item.slug) return { item, detail: null, hasDetailError: true };
        try {
          const detail = await getPortfolioDetail(item.slug);
          return { item, detail: detail?.data ?? null, hasDetailError: false };
        } catch {
          return { item, detail: null, hasDetailError: true };
        }
      })
    );

    return detailed.map(({ item, detail, hasDetailError }, index) => {
      const categoryLabel = getCategoryLabel(detail?.category) || item.categoryTitle?.trim() || "";
      const subCategory = detail?.subCategory?.trim() || item.subCategory?.trim() || "";
      const username = detail?.username?.trim() || item.username?.trim() || "";
      return {
        id: item.slug ? `public-${item.slug}` : `public-${index}`,
        name: username || "미입력",
        username: username || null,
        role: categoryLabel,
        intro: detail?.summaryIntro?.trim() || "",
        profileImage: detail?.profileImg || item.profileImg || undefined,
        email: detail?.email || null,
        phone: detail?.phone || null,
        location: detail?.location || null,
        status: "PUBLISHED",
        isPublic: true,
        category: categoryLabel || null,
        subCategory,
        tags: detail?.tags ?? item.tags ?? [],
        linkHref:
          !hasDetailError && item.slug ? `/portfolio?slug=${encodeURIComponent(item.slug)}` : undefined,
      };
    });
  } catch (error) {
    console.warn("Failed to fetch public cards:", error);
    return [];
  }
}

async function fetchPortfolioDetailById(portfolioId: number): Promise<PortfolioDetailData | null> {
  try {
    const share = await getPortfolioShareLink(portfolioId);
    const slug = share?.data?.trim();
    if (slug) {
      const detail = await getPortfolioDetail(slug);
      if (detail?.data) return detail.data;
    }

    const direct = await apiFetch<any>(`/api/portfolios/${portfolioId}`, {
      method: "GET",
      auth: true,
    });
    if (direct?.data) return direct.data as PortfolioDetailData;
    if (direct?.category || direct?.subCategory) return direct as PortfolioDetailData;

    return null;
  } catch (error) {
    console.warn("Failed to fetch portfolio detail by id:", error);
    return null;
  }
}

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
  const token = getAccessToken();
  if (!token) return null;

  try {
    // ✅ auth:true로 호출하면 Authorization 자동 + 401/403면 refresh 시도
    const json = await apiFetch<any>("/api/portfolios/my", {
      method: "GET",
      auth: true,
    });

    const list: PortfolioItem[] = Array.isArray(json) ? json : json.data || [];
    if (list.length === 0) return null;

    const sortedList = sortByUpdatedDesc(list);
    const publishedList = sortedList.filter((item) => item.status === "PUBLISHED");
    const completedDrafts = sortedList.filter(
      (item) => item.status === "DRAFT" && (item.lastStep ?? 0) >= 5
    );
    const inProgressDrafts = sortedList.filter(
      (item) => item.status === "DRAFT" && (item.lastStep ?? 0) < 5
    );

    const profile = getStoredProfile();
    const storedName = profile?.name?.trim();
    const published = publishedList[0];
    if (published) {
      const { name, role } = normalizeTitleParts(published.title);
      const detail = await fetchPortfolioDetailById(published.id);
      const username = detail?.username?.trim() || published.username?.trim() || storedName || name;
      const intro = detail?.summaryIntro?.trim() || "";
      const tags = Array.isArray(detail?.tags) ? detail?.tags : [];
      const categoryLabel = getCategoryLabel(detail?.category);
      const subCategory = detail?.subCategory || published.subCategory || role;
      return {
        id: published.id.toString(),
        name: username,
        username,
        role: categoryLabel,
        intro,
        profileImage: detail?.profileImg || published.profileImg || undefined,
        email: detail?.email || null,
        phone: detail?.phone || null,
        location: detail?.location || null,
        status: published.status,
        isMine: true,
        linkHref: "/portfolio",
        tags,
        category: categoryLabel || published.category || null,
        subCategory,
      };
    }

    const privateCard = completedDrafts[0];
    if (privateCard) {
      const { name, role } = normalizeTitleParts(privateCard.title);
      const detail = await fetchPortfolioDetailById(privateCard.id);
      const username = detail?.username?.trim() || privateCard.username?.trim() || storedName || name;
      const intro = detail?.summaryIntro?.trim() || "";
      const tags = Array.isArray(detail?.tags) ? detail?.tags : [];
      const categoryLabel = getCategoryLabel(detail?.category);
      const subCategory = detail?.subCategory || privateCard.subCategory || role;
      return {
        id: privateCard.id.toString(),
        name: username,
        username,
        role: categoryLabel,
        intro,
        profileImage: detail?.profileImg || privateCard.profileImg || undefined,
        email: detail?.email || null,
        phone: detail?.phone || null,
        location: detail?.location || null,
        status: privateCard.status,
        isMine: true,
        badge: "비공개됨",
        linkHref: `/create?portfolioId=${privateCard.id}&mode=edit`,
        tags,
        category: categoryLabel || privateCard.category || null,
        subCategory,
      };
    }

    if (inProgressDrafts.length > 0) {
      const singleDraft = inProgressDrafts.length === 1 ? inProgressDrafts[0] : null;
      const titleParts = singleDraft ? normalizeTitleParts(singleDraft.title) : { name: "작성 중인 명함", role: "" };
      const detail = singleDraft ? await fetchPortfolioDetailById(singleDraft.id) : null;
      const username =
        detail?.username?.trim() || singleDraft?.username?.trim() || storedName || titleParts.name;
      const categoryLabel = getCategoryLabel(detail?.category || singleDraft?.category);
      const subCategory = detail?.subCategory || singleDraft?.subCategory || titleParts.role;
      const linkHref = singleDraft
        ? `/create?portfolioId=${singleDraft.id}&step=${singleDraft.lastStep || 1}`
        : "/cards";

      return {
        id: singleDraft ? singleDraft.id.toString() : "in-progress",
        name: username,
        username,
        role: categoryLabel,
        intro: "이어서 작성하기",
        profileImage: singleDraft?.profileImg || undefined,
        status: "DRAFT",
        isMine: true,
        linkHref,
        category: categoryLabel || null,
        subCategory: singleDraft ? subCategory : null,
        progressMode: singleDraft ? "single" : "multiple",
      };
    }

    return null;
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
  const otherLimit = myCard ? Math.max(limit - 1, 0) : limit;

  // 2. 공개 명함 + Mock 데이터를 섞어 홈 카드로 노출
  const publicCards = await fetchPublicCards(otherLimit);

  // 3. 상세 포트폴리오 Mock 데이터를 Card 타입으로 변환 (배경 카드용)
  const mockCards: Card[] = MOCK_PORTFOLIOS.map((portfolio) => ({
    id: portfolio.id.toString(),
    name: portfolio.name,
    username: portfolio.name,
    role: portfolio.category,
    intro: portfolio.summaryIntro || "자기소개가 없습니다.",
    profileImage: portfolio.profileImg || undefined,
    projects: portfolio.projects, // 프로젝트 정보 포함
    status: portfolio.status,
    category: portfolio.category,
    subCategory: portfolio.subCategory,
    email: portfolio.email,
    phone: portfolio.phone,
    location: portfolio.location,
  }));

  const mixedPool = [...publicCards, ...mockCards.filter(isPublicCard)];

  // 4. 랜덤 셔플 및 개수 제한
  const shuffled = mixedPool.sort(() => Math.random() - 0.5).slice(0, otherLimit);

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
  username?: string | null;
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
