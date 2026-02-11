"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./portfolio.module.css";
import Header from "@/components/Header";
import ListView from "./components/ListView";
import CardView from "./components/CardView";
import GridView from "./components/GridView";
import { getAccessToken } from "@/lib/auth/tokens";
import { getPortfolioProjectImages } from "@/lib/storage/project-images";
import { savePortfolioLayoutType, type LayoutType } from "@/lib/api/portfolio-layout";
import { buildApiUrl } from "@/lib/api/config";
import { apiFetch } from "@/lib/api/client";

type PortfolioApiResponse<T> = {
  code: string;
  message: string;
  data?: T;
};

type PortfolioProjectApi = {
  projectName?: string | null;
  projectSummary?: string | null;
  projectImg?: string | null;
  projectLink?: string | null;
};

type PortfolioDetailApi = {
  id: number;
  category: string;
  subCategory: string;
  profileImg: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  projects: PortfolioProjectApi[];
  summaryIntro: string | null;
  layoutType: LayoutType;
  tags?: string[] | null;
  updatedAt: string;
  totalViewCount: number | null;
  todayViewCount: number | null;
  username: string;
  owner: boolean;
};

type MyPortfolioItem = {
  id: number;
  status: "DRAFT" | "PUBLISHED";
  updatedAt: string;
  title?: string | null;
  profileImg?: string | null;
  lastStep?: number | null;
};

export type ProjectLink = { title: string; url: string };
export type Project = {
  title: string;
  projectSummary: string;
  image?: string | null;
  links?: ProjectLink[];
};

export type PortfolioDetail = {
  id: number;
  category: string;
  subCategory: string;
  profileImg: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  projects: Project[];
  summaryIntro: string | null;
  layoutType: LayoutType;
  tags?: string[];
  updatedAt: string;
  totalViewCount: number | null;
  todayViewCount: number | null;
  username: string;
  owner: boolean;
};

const SLUG_REGEX = /^[A-Za-z0-9]{8}$/;

function normalizeSlug(raw: string): string {
  return raw.trim().replace(/\/+$/, "").split("/").filter(Boolean).pop() ?? "";
}

function normalizePortfolio(data: PortfolioDetailApi): PortfolioDetail {
  const localProjectImages = typeof window !== "undefined" ? getPortfolioProjectImages(data.id) : [];

  return {
    ...data,
    username: (data.username ?? "").trim() || "사용자",
    tags: Array.isArray(data.tags) ? data.tags : [],
    projects: (data.projects ?? []).map((project, index) => ({
      title: project.projectName?.trim() || "프로젝트",
      projectSummary: project.projectSummary?.trim() || "",
      image: project.projectImg || localProjectImages[index] || null,
      links: project.projectLink?.trim()
        ? [{ title: "project-link", url: project.projectLink.trim() }]
        : [],
    })),
  };
}

async function fetchPortfolioBySlug(slug: string, auth: boolean): Promise<PortfolioDetail> {
  const url = buildApiUrl(`/api/portfolios/${encodeURIComponent(slug)}`);
  const json = await apiFetch<PortfolioApiResponse<PortfolioDetailApi>>(url, {
    method: "GET",
    // ✅ 공개 포트폴리오는 비로그인(토큰 없음)이어도 조회 가능해야 함
    //    로그인 했을 때만 owner 판별(=본인 여부) 같은 추가 정보를 받을 수 있음
    auth,
  });

  if (json.code !== "SUCCESS" || !json.data) {
    throw new Error(json.message || "명함 데이터를 불러오지 못했습니다.");
  }

  return normalizePortfolio(json.data);
}

async function fetchShareSlug(portfolioId: number): Promise<string> {
  const url = buildApiUrl(`/api/portfolios/${portfolioId}/share-link?t=${Date.now()}`);
  const json = await apiFetch<PortfolioApiResponse<string>>(url, {
    method: "GET",
    auth: true,
  });

  if (json.code !== "SUCCESS" || !json.data?.trim()) {
    throw new Error(json.message || "공유 slug를 가져오지 못했습니다.");
  }

  const slug = normalizeSlug(json.data.trim());
  if (!SLUG_REGEX.test(slug)) throw new Error("공유 slug 형식이 올바르지 않습니다.");

  return slug;
}

async function fetchMyPortfolios(): Promise<MyPortfolioItem[]> {
  const url = buildApiUrl("/api/portfolios/my");
  const json = await apiFetch<PortfolioApiResponse<MyPortfolioItem[]>>(url, {
    method: "GET",
    auth: true,
  });

  if (json.code !== "SUCCESS") {
    throw new Error(json.message || "내 명함 목록을 불러오지 못했습니다.");
  }
  return Array.isArray(json.data) ? json.data : [];
}

function pickPublishedPortfolioIdByListOrder(items: MyPortfolioItem[]): number | null {
  const firstPublished = items.find((item) => item.status === "PUBLISHED");
  return firstPublished?.id ?? null;
}

function buildPortfolioShareUrl(shareValueOrSlug: string): string {
  if (/^https?:\/\//i.test(shareValueOrSlug)) return shareValueOrSlug;
  const normalized = normalizeSlug(shareValueOrSlug);
  return `${window.location.origin}/portfolio?slug=${encodeURIComponent(normalized)}`;
}

export default function PortfolioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedSlug = useMemo(() => normalizeSlug(searchParams.get("slug") || ""), [searchParams]);
  const requestedId = useMemo(() => {
    const raw = searchParams.get("id") || searchParams.get("portfolioId") || "";
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  const hasRequestedSlug = requestedSlug.length > 0;
  const isValidRequestedSlug = hasRequestedSlug && SLUG_REGEX.test(requestedSlug);

  const [layout, setLayout] = useState<LayoutType>("LIST");
  const [data, setData] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedSlug, setResolvedSlug] = useState("");

  const isOwner = data?.owner === true;
  const savedLayout: LayoutType = data?.layoutType ?? "LIST";
  const hasLayoutChanged = isOwner ? layout !== savedLayout : false;

  // ✅ 타인은 저장된 레이아웃만 보여야 함
  const effectiveLayout: LayoutType = isOwner ? layout : savedLayout;

  useEffect(() => {
    let isCancelled = false;
    const token = getAccessToken();

    if (hasRequestedSlug && !isValidRequestedSlug) {
      setLoading(false);
      setData(null);
      setError("slug는 영문/숫자 조합의 8글자여야 합니다.");
      return () => {
        isCancelled = true;
      };
    }

    if (!hasRequestedSlug && !requestedId && !token) {
      setLoading(false);
      setData(null);
      setError(null);
      setResolvedSlug("");
      return () => {
        isCancelled = true;
      };
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const canAuth = Boolean(token);

        let slugToUse = requestedSlug;

        if (!slugToUse && requestedId) {
          slugToUse = await fetchShareSlug(requestedId);
        }

        if (!slugToUse) {
          const myPortfolios = await fetchMyPortfolios();
          const portfolioId = pickPublishedPortfolioIdByListOrder(myPortfolios);
          if (!portfolioId) throw new Error("발행된 명함이 없습니다. 먼저 명함을 발행해 주세요.");
          slugToUse = await fetchShareSlug(portfolioId);
        }

        const detail = await fetchPortfolioBySlug(slugToUse, canAuth);
        if (isCancelled) return;

        setData(detail);

        // ✅ 본인에게만: 서버 저장값으로 초기 레이아웃 세팅 (타인도 harmless)
        setLayout(detail.layoutType || "LIST");

        setResolvedSlug(slugToUse);
      } catch (e) {
        if (isCancelled) return;
        setData(null);
        setResolvedSlug("");
        setError(e instanceof Error ? e.message : "명함 정보를 불러오지 못했습니다.");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [requestedSlug, hasRequestedSlug, isValidRequestedSlug, requestedId]);

  const handleApplyLayout = async () => {
    if (!data?.owner || !data.id) return;
    if (!hasLayoutChanged) return;

    try {
      setSavingLayout(true);
      await savePortfolioLayoutType(data.id, layout);
      setData((prev) => (prev ? { ...prev, layoutType: layout } : prev));
    } catch (e) {
      alert(e instanceof Error ? e.message : "레이아웃 저장 실패");
    } finally {
      setSavingLayout(false);
    }
  };

  const handleCopyLink = async () => {
    if (!data) return;

    try {
      const fallbackPublicLink = resolvedSlug ? buildPortfolioShareUrl(resolvedSlug) : window.location.href;
      const targetLink =
        data.owner && data.id ? buildPortfolioShareUrl(await fetchShareSlug(data.id)) : fallbackPublicLink;

      await navigator.clipboard.writeText(targetLink);
      alert("링크를 복사했습니다.");
    } catch {
      alert("링크 복사에 실패했습니다. 주소창의 링크를 직접 복사해 주세요.");
    }
  };

  const handleEditPortfolio = () => {
    if (!data?.id) {
      alert("수정할 명함 정보를 찾을 수 없습니다.");
      return;
    }
    router.push(`/create?portfolioId=${data.id}&mode=edit`);
  };

  return (
    <div className={styles.fullScreenContainer}>
      <div className={styles.headerContainer}>
        <Header />
      </div>

      <div className={styles.toolbar}>
        {/* ✅ 본인일 때만 레이아웃 선택 + 저장 버튼 */}
        {isOwner && (
          <div className={styles.layoutRow}>
            <div className={styles.layoutSwitcher}>
              <button
                onClick={() => setLayout("CARD")}
                className={`${styles.switchBtn} ${layout === "CARD" ? styles.switchBtnActive : ""}`}
              >
                카드형
              </button>
              <button
                onClick={() => setLayout("LIST")}
                className={`${styles.switchBtn} ${layout === "LIST" ? styles.switchBtnActive : ""}`}
              >
                리스트형
              </button>
              <button
                onClick={() => setLayout("GRID")}
                className={`${styles.switchBtn} ${layout === "GRID" ? styles.switchBtnActive : ""}`}
              >
                그리드형
              </button>
            </div>

            {hasLayoutChanged && (
              <button
                onClick={handleApplyLayout}
                disabled={savingLayout}
                className={styles.layoutSaveFloatBtn}
              >
                {savingLayout ? "저장 중..." : "저장"}
              </button>
            )}
          </div>
        )}

        <div className={styles.actionGroup}>
          {isOwner && (
            <button className={styles.actionBtn} onClick={handleEditPortfolio}>
              항목 수정
            </button>
          )}
          <button className={styles.actionBtn} onClick={handleCopyLink}>
            링크 복사
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {!hasRequestedSlug && !requestedId && !resolvedSlug && !loading && !error && (
          <div className={styles.stateBox}>
            <div className={styles.stateTitle}>공유 링크(slug)가 필요합니다.</div>
            <div className={styles.stateDesc}>
              URL 뒤에 <code className={styles.inlineCode}>?slug=8글자</code> 또는{" "}
              <code className={styles.inlineCode}>?id=포트폴리오ID</code> 형태로 접속해 주세요.
              <br />
              예시: <code className={styles.inlineCode}>/portfolio?slug=ab12cd34</code> 또는{" "}
              <code className={styles.inlineCode}>/portfolio?id=3</code>
            </div>
          </div>
        )}

        {loading && (
          <div className={styles.stateBox}>
            <div className={styles.stateTitle}>불러오는 중입니다.</div>
            <div className={styles.stateDesc}>명함 데이터를 가져오고 있습니다.</div>
          </div>
        )}

        {!loading && error && (
          <div className={styles.stateBox}>
            <div className={styles.stateTitle}>불러오기 실패</div>
            <div className={styles.stateDesc}>{error}</div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* ✅ 조회수는 owner일 때만 */}
            {effectiveLayout === "CARD" && <CardView data={data} canViewStats={isOwner} />}
            {effectiveLayout === "LIST" && <ListView data={data} isOwner={data.owner} />}
            {effectiveLayout === "GRID" && <GridView data={data} isOwner={data.owner} />}
          </>
        )}
      </div>
    </div>
  );
}
