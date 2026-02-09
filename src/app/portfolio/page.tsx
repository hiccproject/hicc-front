// src/app/portfolio/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./portfolio.module.css";
import Header from "@/components/Header";
import ListView from "./components/ListView";
import CardView from "./components/CardView";
import GridView from "./components/GridView";
import { getAccessToken } from "@/lib/auth/tokens";

type LayoutType = "CARD" | "LIST" | "GRID";

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
  owner: boolean;
};

const SLUG_REGEX = /^[A-Za-z0-9]{8}$/;

function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeSlug(raw: string): string {
  return raw.trim().replace(/\/+$/, "").split("/").filter(Boolean).pop() ?? "";
}

function getApiMessage<T>(json: PortfolioApiResponse<T> | null, status: number): string {
  if (json?.message) return json.message;
  return `요청에 실패했습니다. (${status})`;
}

function normalizePortfolio(data: PortfolioDetailApi): PortfolioDetail {
  return {
    ...data,
    tags: Array.isArray(data.tags) ? data.tags : [],
    projects: (data.projects ?? []).map((project) => ({
      title: project.projectName?.trim() || "프로젝트",
      projectSummary: project.projectSummary?.trim() || "",
      image: project.projectImg || null,
      links: project.projectLink?.trim()
        ? [{ title: "project-link", url: project.projectLink.trim() }]
        : [],
    })),
  };
}

async function fetchPortfolioBySlug(slug: string): Promise<PortfolioDetail> {
  const res = await fetch(`/api/portfolios/${encodeURIComponent(slug)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...getAuthHeaders(),
    },
  });

  let json: PortfolioApiResponse<PortfolioDetailApi> | null = null;
  try {
    json = (await res.json()) as PortfolioApiResponse<PortfolioDetailApi>;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(getApiMessage(json, res.status));
  }
  if (!json?.data) {
    throw new Error("명함 데이터가 비어 있습니다.");
  }
  return normalizePortfolio(json.data);
}

async function fetchShareSlug(portfolioId: number): Promise<string> {
  const res = await fetch(`/api/portfolios/${portfolioId}/share-link`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...getAuthHeaders(),
    },
  });

  let json: PortfolioApiResponse<string> | null = null;
  try {
    json = (await res.json()) as PortfolioApiResponse<string>;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(getApiMessage(json, res.status));
  }

  const shareValue = json?.data?.trim();
  if (!shareValue) {
    throw new Error("공유 slug를 가져오지 못했습니다.");
  }

  const slug = normalizeSlug(shareValue);
  if (!SLUG_REGEX.test(slug)) {
    throw new Error("공유 slug 형식이 올바르지 않습니다.");
  }

  return slug;
}

async function fetchMyPortfolios(): Promise<MyPortfolioItem[]> {
  const res = await fetch("/api/portfolios/my", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...getAuthHeaders(),
    },
  });

  let json: PortfolioApiResponse<MyPortfolioItem[]> | MyPortfolioItem[] | null = null;
  try {
    json = (await res.json()) as PortfolioApiResponse<MyPortfolioItem[]> | MyPortfolioItem[];
  } catch {
    json = null;
  }

  if (!res.ok) {
    const normalized = Array.isArray(json) ? null : json;
    throw new Error(getApiMessage(normalized, res.status));
  }

  if (Array.isArray(json)) return json;
  return Array.isArray(json?.data) ? json.data : [];
}

function pickPublishedPortfolioIdByListOrder(items: MyPortfolioItem[]): number | null {
  const firstPublished = items.find((item) => item.status === "PUBLISHED");
  return firstPublished?.id ?? null;
}

function buildPortfolioShareUrl(shareValueOrSlug: string): string {
  if (/^https?:\/\//i.test(shareValueOrSlug)) {
    return shareValueOrSlug;
  }
  const normalized = normalizeSlug(shareValueOrSlug);
  return `${window.location.origin}/portfolio?slug=${encodeURIComponent(normalized)}`;
}

export default function PortfolioPage() {
  const searchParams = useSearchParams();
  const requestedSlug = useMemo(() => normalizeSlug(searchParams.get("slug") || ""), [searchParams]);
  const hasRequestedSlug = requestedSlug.length > 0;
  const isValidRequestedSlug = hasRequestedSlug && SLUG_REGEX.test(requestedSlug);

  const [layout, setLayout] = useState<LayoutType>("LIST");
  const [data, setData] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedSlug, setResolvedSlug] = useState("");

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

    if (!hasRequestedSlug && !token) {
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

        let slugToUse = requestedSlug;

        if (!slugToUse) {
          const myPortfolios = await fetchMyPortfolios();
          const portfolioId = pickPublishedPortfolioIdByListOrder(myPortfolios);

          if (!portfolioId) {
            throw new Error("발행된 명함이 없습니다. 먼저 명함을 발행해 주세요.");
          }

          slugToUse = await fetchShareSlug(portfolioId);
        }

        const detail = await fetchPortfolioBySlug(slugToUse);
        if (isCancelled) return;

        setData(detail);
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
  }, [requestedSlug, hasRequestedSlug, isValidRequestedSlug]);

  const handleCopyLink = async () => {
    if (!data) return;

    try {
      const fallbackPublicLink = resolvedSlug ? buildPortfolioShareUrl(resolvedSlug) : window.location.href;

      const targetLink =
        data.owner && data.id
          ? buildPortfolioShareUrl(await fetchShareSlug(data.id))
          : fallbackPublicLink;

      await navigator.clipboard.writeText(targetLink);
      alert("링크를 복사했습니다.");
    } catch {
      alert("링크 복사에 실패했습니다. 주소창의 링크를 직접 복사해 주세요.");
    }
  };

  const canViewStats = Boolean(getAccessToken());

  return (
    <div className={styles.fullScreenContainer}>
      <div className={styles.headerContainer}>
        <Header />
      </div>

      <div className={styles.toolbar}>
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

        <div className={styles.actionGroup}>
          <button className={styles.actionBtn}>명함 미리보기</button>
          {data?.owner && <button className={styles.actionBtn}>항목 수정</button>}
          <button className={styles.actionBtn} onClick={handleCopyLink}>
            링크 복사
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {!hasRequestedSlug && !resolvedSlug && !loading && !error && (
          <div className={styles.stateBox}>
            <div className={styles.stateTitle}>공유 링크(slug)가 필요합니다.</div>
            <div className={styles.stateDesc}>
              URL 뒤에 <code className={styles.inlineCode}>?slug=8글자</code> 형태로 접속해 주세요.
              <br />
              예시: <code className={styles.inlineCode}>/portfolio?slug=ab12cd34</code>
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
            {layout === "CARD" && <CardView data={data} canViewStats={canViewStats} />}
            {layout === "LIST" && <ListView data={data} isOwner={data.owner} />}
            {layout === "GRID" && <GridView data={data} isOwner={data.owner} />}
          </>
        )}
      </div>
    </div>
  );
}