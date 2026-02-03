// src/app/portfolio/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./portfolio.module.css";
import Header from "@/components/Header";
import ListView from "./components/ListView";
import CardView from "./components/CardView";
import GridView from "./components/GridView";

type LayoutType = "CARD" | "LIST" | "GRID";

type PortfolioApiResponse<T> = {
  code: string;
  message: string;
  data?: T;
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
  updatedAt: string;
  totalViewCount: string | null;
  todayViewCount: string | null;
  owner: boolean;
};

async function fetchPortfolioBySlug(slug: string): Promise<PortfolioDetail> {
  /**
   * 백엔드 실제 라우트가 프로젝트마다 달라지는 경우가 많아서
   * “slug 조회” 후보 URL을 2개 순서대로 시도하도록 만들었어.
   * - 1순위: /api/portfolios/share-link/{slug}
   * - 2순위: /api/portfolios/{slug}
   *
   * 만약 팀 명세가 확정되어 있으면 후보 하나만 남겨도 돼.
   */
  const candidates = [
    `/api/portfolios/share-link/${encodeURIComponent(slug)}`,
    `/api/portfolios/${encodeURIComponent(slug)}`,
  ];

  let lastErr: unknown = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "GET",
        credentials: "include", // 로그인 유저면 owner/뷰카운트가 내려올 수 있음
        headers: { Accept: "application/json" },
      });

      const json = (await res.json()) as PortfolioApiResponse<PortfolioDetail>;

      if (!res.ok) {
        // 400 에러 예: { code: "A002", message: "아직 발행되지 않은 명함입니다." }
        const msg = json?.message || `요청 실패 (${res.status})`;
        throw new Error(msg);
      }

      if (!json?.data) throw new Error("응답 데이터가 비어있습니다.");
      return json.data;
    } catch (e) {
      lastErr = e;
      // 다음 후보 URL 시도
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("명함 정보를 불러오지 못했습니다.");
}

export default function PortfolioPage() {
  const searchParams = useSearchParams();
  const slug = useMemo(() => searchParams.get("slug")?.trim() || "", [searchParams]);

  const [layout, setLayout] = useState<LayoutType>("LIST");
  const [data, setData] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setData(null);
      setError(null);
      return;
    }

    let isCancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const detail = await fetchPortfolioBySlug(slug);
        if (isCancelled) return;

        setData(detail);
        setLayout(detail.layoutType || "LIST");
      } catch (e) {
        if (isCancelled) return;

        setError(e instanceof Error ? e.message : "명함 정보를 불러오지 못했습니다.");
        setData(null);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("링크가 복사되었습니다!");
    } catch {
      alert("복사에 실패했습니다. 주소창의 링크를 직접 복사해주세요.");
    }
  };

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
            카드
          </button>
          <button
            onClick={() => setLayout("LIST")}
            className={`${styles.switchBtn} ${layout === "LIST" ? styles.switchBtnActive : ""}`}
          >
            리스트
          </button>
          <button
            onClick={() => setLayout("GRID")}
            className={`${styles.switchBtn} ${layout === "GRID" ? styles.switchBtnActive : ""}`}
          >
            그리드
          </button>
        </div>

        <div className={styles.actionGroup}>
          <button className={styles.actionBtn}>👁️ 미리보기</button>
          {data?.owner && <button className={styles.actionBtn}>✏️ 수정</button>}
          <button className={styles.actionBtn} onClick={handleCopyLink}>
            🔗 복사
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {!slug && (
          <div className={styles.stateBox}>
            <div className={styles.stateTitle}>공유 링크(slug)가 필요해요</div>
            <div className={styles.stateDesc}>
              URL 뒤에 <code className={styles.inlineCode}>?slug=8글자</code> 형태로 붙여서 접속해줘.
              <br />
              예) <code className={styles.inlineCode}>/portfolio?slug=ab12cd34</code>
            </div>
          </div>
        )}

        {slug && loading && (
          <div className={styles.stateBox}>
            <div className={styles.stateTitle}>불러오는 중…</div>
            <div className={styles.stateDesc}>명함 정보를 가져오고 있어.</div>
          </div>
        )}

        {slug && !loading && error && (
          <div className={styles.stateBox}>
            <div className={styles.stateTitle}>불러오기 실패</div>
            <div className={styles.stateDesc}>{error}</div>
          </div>
        )}

        {slug && !loading && !error && data && (
          <>
            {layout === "CARD" && <CardView data={data} />}
            {layout === "LIST" && <ListView data={data} isOwner={data.owner} />}
            {layout === "GRID" && <GridView data={data} isOwner={data.owner} />}
          </>
        )}
      </div>
    </div>
  );
}
