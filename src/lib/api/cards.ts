// (예: src/lib/api/cards.ts 또는 홈 카드 관련 api 모듈)
// 목적
// - 홈 화면에서 사용할 "내 명함(myCard) + 공개 명함(cards)" 데이터를 조합해서 제공
// - 내 명함은 /api/portfolios/my 기반으로 상태(DRAFT/PUBLISHED)와 lastStep을 참고해 선정
// - 공개 명함은 /api/portfolios/list로 목록을 가져오고, slug 기반 상세 조회로 보강해서 Card로 매핑
// - 포트폴리오 생성/수정/공유/삭제 등 포트폴리오 관련 API 함수도 함께 제공
//
// 중요/주의 포인트(이 파일에서 특히 중요)
// 1) 인증이 필요 없는 공개 API와 인증이 필요한 내 API가 섞여 있음
// 2) getPortfolioDetail을 auth:true로 호출하고 있는데, 공개 리스트에서 가져온 slug 상세를 조회할 때도 auth:true로 호출됨
//    - 비로그인 사용자 홈에서 공개 카드 디테일 조회가 막힐 수 있음
//    - 아래 주석에 해결 방향(공개 상세는 getPublicPortfolioDetail 사용)을 명시
// 3) getRecentPortfolioId에서 fetch("/api/portfolios/my")를 buildApiUrl 없이 호출하고 있음
//    - Next.js 내부 route(/api)로 오해되어 프록시/배포 환경에서 깨질 수 있음
//    - 또한 Authorization만 넣고 credentials/cache 설정이 다르고, apiFetch와 정책이 불일치
// 4) getSafeToken은 선언만 되고 실제로 사용되지 않음(죽은 코드 가능성)
// 5) 타입/응답 래핑 형태(json이 배열인지 {data:[]}인지)가 흔들리는 전제를 코드가 많이 품고 있음
//    - extractTokens처럼 "응답 통일" 또는 백엔드 응답 고정이 되면 코드가 훨씬 단순해짐

import type { Card } from "@/types/card";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/tokens";
import { getStoredProfile } from "@/lib/auth/profile";
import { buildApiUrl } from "@/lib/api/config";

// 홈에서 사용할 응답 형태: 내 명함 1개 + 다른 공개 명함 배열
export type HomeCardsResponse = {
  myCard: Card | null;
  cards: Card[];
};

// 내 명함 목록(/api/portfolios/my)에서 내려올 것으로 가정한 아이템 타입
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

// 공개 리스트(/api/portfolios/list)의 item 타입(목록용 정보만 있다고 가정)
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

// 공개 리스트 응답 타입 (content + hasNext)
type PublicPortfolioListResponse = {
  content: PublicPortfolioListItem[];
  hasNext: boolean;
};

// title을 "이름 - 역할" 형식으로 저장/표시하는 UI 규칙을 정규화하기 위한 구조
type TitleParts = {
  name: string;
  role: string;
};

function normalizeTitleParts(title?: string | null): TitleParts {
  // 백엔드가 "null - null" 같은 문자열로 내려주는 케이스 방어
  if (!title || title === "null - null") {
    return { name: "작성 중인 명함", role: "미정" };
  }

  // "이름 - 역할" 형태라면 앞/뒤를 분리
  if (title.includes(" - ")) {
    const parts = title.split(" - ");
    if (parts.length >= 2) {
      return { name: parts[0] || "제목 없음", role: parts[1] || "Role" };
    }
  }

  // 분리 불가하면 title 전체를 name으로 보고 role은 기본값
  return { name: title || "제목 없음", role: "Role" };
}

function sortByUpdatedDesc(list: PortfolioItem[]) {
  // updatedAt 기반 내림차순 정렬
  // 주의: updatedAt이 ISO가 아닌 포맷이면 Date 파싱이 깨질 수 있음(백엔드 포맷 고정 권장)
  return [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

// 카테고리 코드 -> 한글 라벨 매핑(화면 표시용)
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
  // 공개 카드 필터:
  // - status가 존재하면 PUBLISHED만 허용
  // - isPublic === false면 제외
  // - slug 없으면 상세 링크 불가하므로 제외
  if (item.status && item.status !== "PUBLISHED") return false;
  if (item.isPublic === false) return false;
  if (!item.slug) return false;
  return true;
}

function pickRandom<T>(list: T[]) {
  // 빈 리스트면 null
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// share-link가 "https://.../portfolio/abcd1234" 형태일 수도 있어서 마지막 path segment를 slug로 추출
function extractSlug(value?: string | null) {
  return value?.trim().replace(/\/+$/, "").split("/").filter(Boolean).pop() || "";
}

function normalizePortfolioSlug(slug: string) {
  // slug가 "https://.../abcd" 혹은 "/abcd/"로 들어와도 마지막 segment만 남기기
  return slug.trim().replace(/\/+$/, "").split("/").filter(Boolean).pop();
}

/**
 * 공개 명함을 limit만큼 가져와 Card[]로 변환
 *
 * 동작
 * 1) /api/portfolios/list?page=0&size=limit&sort=LATEST 로 목록 조회
 * 2) 공개 조건 필터링
 * 3) 각 item.slug로 상세 조회해서(요약/연락처/태그 등) 보강
 * 4) Card 형태로 매핑
 *
 * 중요 구현 검토:
 * - 현재 상세 조회에 getPortfolioDetail(item.slug)를 사용하고 있음(아래 코드)
 * - getPortfolioDetail은 auth:true 호출이라 비로그인 상태에서 실패할 수 있음
 * - 공개 상세가 비인증으로 열려 있다면 getPublicPortfolioDetail을 사용해야 한다.
 */
async function fetchPublicCards(limit: number): Promise<Card[]> {
  if (limit <= 0) return [];

  try {
    const params = new URLSearchParams();
    params.set("sort", "LATEST");
    params.set("page", "0");
    params.set("size", String(Math.max(limit, 0)));

    // 공개 리스트는 보통 인증이 필요 없으므로 fetch로 직접 호출
    // - apiFetch를 써도 되지만(응답 파싱/에러 처리 통일),
    //   여기서는 res.ok 체크 후 빈 배열로 실패 처리하는 정책을 택함
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
          // 중요:
          // - 여기서 getPortfolioDetail은 auth:true라 비로그인 상태면 401/403로 실패할 수 있음
          // - 공개 상세가 존재한다면 getPublicPortfolioDetail(item.slug)로 바꾸는 게 더 맞음
          const detail = await getPortfolioDetail(item.slug);
          return { item, detail: detail?.data ?? null, hasDetailError: false };
        } catch {
          return { item, detail: null, hasDetailError: true };
        }
      })
    );

    return detailed.map(({ item, detail, hasDetailError }, index) => {
      // categoryTitle은 목록에서 오는 라벨, detail.category는 코드일 가능성
      // 우선순위를 섞어서 최대한 사용자에게 보이는 값을 채우는 전략
      const categoryLabel =
        getCategoryLabel(detail?.category) || item.categoryTitle?.trim() || "";

      const subCategory = detail?.subCategory?.trim() || item.subCategory?.trim() || "";
      const username = detail?.username?.trim() || item.username?.trim() || "";

      return {
        // 공개 카드는 slug 기반 식별자 사용
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
          // 상세 조회가 성공한 경우에만 slug 상세 링크 제공(실패 시 깨진 링크 방지)
          !hasDetailError && item.slug
            ? `/portfolio?slug=${encodeURIComponent(item.slug)}`
            : undefined,
      };
    });
  } catch (error) {
    // 홈은 "실패해도 화면은 떠야" 하므로 throw 대신 빈 배열 반환 정책
    console.warn("Failed to fetch public cards:", error);
    return [];
  }
}

/**
 * 포트폴리오 상세를 id로 가져오기 위한 보강 로직
 *
 * 시도 순서:
 * 1) share-link API로 slug를 얻고 → slug로 상세 조회
 * 2) 실패하면 /api/portfolios/{id} 직접 조회로 fallback
 *
 * 이유:
 * - 상세 API가 slug 기반으로 고정되어 있거나(공개 공유 링크 중심),
 *   id 기반 상세가 별도/제한적일 수 있어서 두 경로를 다 시도함
 */
async function fetchPortfolioDetailById(portfolioId: number): Promise<PortfolioDetailData | null> {
  try {
    const share = await getPortfolioShareLink(portfolioId);
    const slug = share?.data?.trim();

    if (slug) {
      const detail = await getPortfolioDetail(slug);
      if (detail?.data) return detail.data;
    }

    // id 기반 직접 조회 fallback
    const direct = await apiFetch<any>(`/api/portfolios/${portfolioId}`, {
      method: "GET",
      auth: true,
    });

    // 응답 래핑이 { data: ... } 또는 바로 객체일 수 있어 둘 다 처리
    if (direct?.data) return direct.data as PortfolioDetailData;
    if (direct?.category || direct?.subCategory) return direct as PortfolioDetailData;

    return null;
  } catch (error) {
    console.warn("Failed to fetch portfolio detail by id:", error);
    return null;
  }
}

/**
 * getSafeToken
 * - SSR에서 localStorage 접근을 피하기 위한 유틸
 * - 현재 파일 내에서는 실제로 사용되지 않으므로
 *   필요 없으면 제거하거나, getAccessToken으로 통일하는 게 더 깔끔함
 */
function getSafeToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

/**
 * getRecentPortfolioId
 *
 * 내 포트폴리오 중 "이어쓰기 대상"을 찾기 위한 함수로 보임.
 * - DRAFT가 있으면 그걸 우선 반환
 * - 없으면 최신 PUBLISHED를 반환(수정모드 대비)
 *
 * 중요 구현 검토(문제 가능성이 큰 부분):
 * 1) fetch("/api/portfolios/my")가 buildApiUrl을 쓰지 않음
 *    - Next.js app에서 "/api/..."는 프론트 자체 API route로 오해될 수 있음
 *    - 배포 환경에서 프록시가 없으면 404/다른 서버로 갈 가능성
 * 2) credentials/cache/no-store 등 apiFetch 정책과 불일치
 * 3) Authorization 헤더만 붙이고 refresh 처리가 없음 → 오래 머문 뒤 호출 시 401/403에 취약
 *
 * 권장:
 * - apiFetch("/api/portfolios/my", { method:"GET", auth:true })로 통일하는 게 안전
 */
export async function getRecentPortfolioId(): Promise<{ id: number; status: string; lastStep: number } | null> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (!token) return null;

  try {
    const res = await fetch("/api/portfolios/my", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const list: any[] = Array.isArray(json) ? json : json.data || [];

    if (list.length === 0) return null;

    const draft = list.find((item) => item.status === "DRAFT");
    if (draft) {
      return { id: draft.id, status: draft.status, lastStep: draft.lastStep || 1 };
    }

    const sorted = list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
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
 * fetchMyCard
 *
 * "내 명함" 선정 로직
 * 1) 토큰 없으면 null (비로그인)
 * 2) 내 명함 목록을 가져와(updatedAt 최신순)
 *    - PUBLISHED 중 랜덤 1개 우선
 *    - 없으면 lastStep>=5인 DRAFT(완성 but 비공개) 중 랜덤
 *    - 없으면 lastStep<5인 DRAFT(작성중)
 *      - 1개면 이어쓰기 링크 제공
 *      - 여러 개면 목록(/cards)로 보내는 링크 제공
 *    - 아무것도 없으면 생성(/create) 링크 제공
 *
 * 구현 의도:
 * - 홈에서 "내 카드"가 항상 유의미한 CTA(보기/수정/이어쓰기/생성)를 갖도록 구성
 */
export async function fetchMyCard(): Promise<Card | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    // auth:true로 호출하면 Authorization 자동 + 401/403면 refresh 시도
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

    // 로컬 저장된 프로필 이름을 UI 기본값으로 사용
    // (백엔드 username이 비어있을 때 최소한 "회원" 대신 이름을 보여주기)
    const profile = getStoredProfile();
    const storedName = profile?.name?.trim() || "회원";

    // 1) 공개(PUBLISHED) 카드 우선
    const published = pickRandom(publishedList);
    if (published) {
      const { name, role } = normalizeTitleParts(published.title);

      // 상세 정보 보강(연락처/intro/tags/category/subCategory 등)
      const detail = await fetchPortfolioDetailById(published.id);

      // linkHref: 공유 링크(slug) 기반으로 상세 페이지로 이동
      let linkHref = "/portfolio";
      try {
        const share = await getPortfolioShareLink(published.id);
        const slug = extractSlug(share?.data ?? "");
        if (slug) linkHref = `/portfolio?slug=${encodeURIComponent(slug)}`;
      } catch {
        linkHref = "/portfolio";
      }

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
        linkHref,
        tags,
        category: categoryLabel || published.category || null,
        subCategory,
      };
    }

    // 2) 완성된 DRAFT(비공개) 카드
    const privateCard = pickRandom(completedDrafts);
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
        // 비공개/작성완료 상태는 edit 모드로 보내는 CTA
        linkHref: `/create?portfolioId=${privateCard.id}&mode=edit`,
        tags,
        category: categoryLabel || privateCard.category || null,
        subCategory,
      };
    }

    // 3) 작성 중 DRAFT
    if (inProgressDrafts.length > 0) {
      // 1개면 이어쓰기 링크를 직접 제공
      if (inProgressDrafts.length === 1) {
        const singleDraft = inProgressDrafts[0];
        const titleParts = normalizeTitleParts(singleDraft.title);
        const detail = await fetchPortfolioDetailById(singleDraft.id);

        const username =
          detail?.username?.trim() || singleDraft?.username?.trim() || storedName || titleParts.name;

        const categoryLabel = getCategoryLabel(detail?.category || singleDraft?.category);
        const subCategory = detail?.subCategory || singleDraft?.subCategory || titleParts.role;

        return {
          id: singleDraft.id.toString(),
          name: username,
          username,
          role: categoryLabel,
          intro: "이어서 작성하기",
          profileImage: detail?.profileImg || singleDraft.profileImg || undefined,
          status: "DRAFT",
          isMine: true,
          // lastStep 기준 이어쓰기
          linkHref: `/create?portfolioId=${singleDraft.id}&step=${singleDraft.lastStep || 1}`,
          category: categoryLabel || null,
          subCategory,
          progressMode: "single",
        };
      }

      // 여러 개면 목록으로 이동(사용자가 선택)
      return {
        id: "in-progress",
        name: storedName,
        username: storedName,
        intro: "이어서 작성하기",
        status: "DRAFT",
        isMine: true,
        linkHref: "/cards",
        progressMode: "multiple",
      };
    }

    // 4) 아무것도 없으면 생성 CTA
    return {
      id: "empty",
      name: storedName,
      username: storedName,
      intro: "명함 생성하기",
      status: "DRAFT",
      isMine: true,
      linkHref: "/create",
      progressMode: "multiple",
    };
  } catch (e) {
    console.error("Failed to fetch my card:", e);
    return null;
  }
}

/**
 * getHomeCards
 *
 * 홈 카드 구성 로직
 * 1) 내 명함(myCard)을 먼저 가져옴
 * 2) 남는 슬롯만큼 공개 명함(publicCards)을 가져옴
 * 3) 공개 명함은 랜덤 셔플 후 제한 개수만 반환
 */
export async function getHomeCards(limit = 6): Promise<HomeCardsResponse> {
  const myCard = await fetchMyCard();
  const otherLimit = myCard ? Math.max(limit - 1, 0) : limit;

  const publicCards = await fetchPublicCards(otherLimit);

  // 단순 셔플(균등 셔플이 엄밀히 필요하면 Fisher–Yates 권장)
  const shuffled = publicCards.sort(() => Math.random() - 0.5).slice(0, otherLimit);

  return {
    myCard,
    cards: shuffled,
  };
}

// --- 포트폴리오 생성/저장/공유/상태/삭제 관련 API ---

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
 * savePortfolioStep
 *
 * 단계별 저장 API 호출
 * - step은 1~5
 * - 1단계 이후에는 portfolioId를 같이 보내야 이어서 저장 가능
 *
 * 구현 포인트:
 * - portfolioId는 0 같은 falsy 값이 들어와도 누락되지 않도록 null/undefined만 배제
 * - auth:true로 토큰 자동 첨부 및 refresh 처리
 */
export async function savePortfolioStep(step: number, body: any, portfolioId?: number | null) {
  const params = new URLSearchParams({ step: step.toString() });

  if (portfolioId !== null && portfolioId !== undefined) {
    params.append("portfolioId", portfolioId.toString());
  }

  return apiFetch<{ data: number }>(`/api/portfolios/save?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify(body),
    auth: true,
  });
}

/**
 * getPortfolioShareLink
 * - 포트폴리오 id로 공유 링크(또는 slug)를 얻는 API
 * - auth:true: 내 포트폴리오만 발급/조회 가능한 정책일 가능성
 */
export async function getPortfolioShareLink(portfolioId: number) {
  return apiFetch<{ data: string }>(`/api/portfolios/${portfolioId}/share-link`, {
    method: "GET",
    auth: true,
  });
}

/**
 * getPortfolioDetail
 * - slug 기반 상세 조회
 *
 * 중요 검토:
 * - auth:true로 되어 있어서 비로그인 사용자가 slug로 공개 포트폴리오를 보는 경우 막힐 수 있음
 * - 공개 상세 조회는 아래 getPublicPortfolioDetail로 분리되어 있으니,
 *   호출부에서 "공개/비공개"를 정확히 나눠 쓰는 것이 핵심
 */
export async function getPortfolioDetail(slug: string) {
  const normalizedSlug = normalizePortfolioSlug(slug);
  if (!normalizedSlug) {
    throw new Error("유효한 포트폴리오 슬러그가 없습니다.");
  }

  return apiFetch<{ data: PortfolioDetailData }>(
    `/api/portfolios/${encodeURIComponent(normalizedSlug)}`,
    { method: "GET", auth: true }
  );
}

/**
 * getPublicPortfolioDetail
 * - 공개 상세 조회(비인증)
 * - 공개 페이지에서 사용해야 비로그인도 접근 가능
 */
export async function getPublicPortfolioDetail(slug: string) {
  const normalizedSlug = normalizePortfolioSlug(slug);
  if (!normalizedSlug) {
    throw new Error("유효한 포트폴리오 슬러그가 없습니다.");
  }

  return apiFetch<{ data: PortfolioDetailData }>(
    `/api/portfolios/${encodeURIComponent(normalizedSlug)}`,
    { method: "GET" }
  );
}

/**
 * deletePortfolio
 * - 포트폴리오 삭제(인증 필요)
 */
export async function deletePortfolio(portfolioId: number) {
  return apiFetch(`/api/portfolios/${portfolioId}`, {
    method: "DELETE",
    auth: true,
  });
}

/**
 * updatePortfolioStatus
 * - DRAFT/PUBLISHED 상태 변경(인증 필요)
 */
export async function updatePortfolioStatus(portfolioId: number, status: "DRAFT" | "PUBLISHED") {
  return apiFetch(`/api/portfolios/${portfolioId}/status`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ status }),
  });
}