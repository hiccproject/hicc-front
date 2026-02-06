// src/app/portfolio/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // useRouter 추가
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

async function fetchShareLink(portfolioId: number): Promise<string> {
  const res = await fetch(`/api/portfolios/${portfolioId}/share-link`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const json = (await res.json()) as PortfolioApiResponse<string>;
  if (!res.ok) {
    throw new Error(json?.message || `요청 실패 (${res.status})`);
  }
  if (!json?.data) {
    throw new Error("공유 링크가 비어있습니다.");
  }
  return json.data;
}

// [기존] 슬러그로 조회
async function fetchPortfolioBySlug(slug: string): Promise<PortfolioDetail> {
  const res = await fetch(`/api/portfolios/${encodeURIComponent(slug)}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = (await res.json()) as PortfolioApiResponse<PortfolioDetail>;

 if (!res.ok) {
    const msg = json?.message || `요청 실패 (${res.status})`;
    throw new Error(msg);
  }
  if (!json?.data) throw new Error("응답 데이터가 비어있습니다.");
  return json.data;
}

// [추가] 내 포트폴리오 조회 (Slug 없이 접근 시)
async function fetchMyPortfolio(): Promise<PortfolioDetail | null> {
  // 백엔드 명세에 따라 '/api/portfolios/my' 또는 본인 확인 가능한 엔드포인트 사용
  // 여기서는 예시로 '/api/portfolios/my'를 호출한다고 가정합니다.
  const url = `/api/portfolios/my`; 

  const res = await fetch(url, {
    method: "GET",
    credentials: "include", // 쿠키(토큰) 포함 필수
    headers: { Accept: "application/json" },
  });

  const json = (await res.json()) as PortfolioApiResponse<PortfolioDetail>;

  if (res.status === 404 || json.code === "C002") {
    // 포트폴리오가 없는 경우 (null 반환하여 생성하기 버튼 유도)
    return null;
  }

  if (!res.ok) {
    throw new Error(json?.message || "내 정보를 불러오지 못했습니다.");
  }

  return json.data || null;
} 

// [추가] 포트폴리오 생성하기 (Step 1)
async function createPortfolioDraft() {
  const res = await fetch(`/api/portfolios/save?step=1`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "OTHERS", // 기본값 설정
      subCategory: "",
      profileImg: "",
    }),
  });
  
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "생성 실패");
  return json.data; // portfolioId 반환
}

export default function PortfolioPage() {
  const router = useRouter(); // 라우터 사용
  const searchParams = useSearchParams();
  const slug = useMemo(() => searchParams.get("slug")?.trim() || "", [searchParams]);

  const [layout, setLayout] = useState<LayoutType>("LIST");
  const [data, setData] = useState<PortfolioDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // [추가] 포트폴리오가 아예 없는 상태인지 체크
  const [isNoPortfolio, setIsNoPortfolio] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setIsNoPortfolio(false);

        let detail: PortfolioDetail | null = null;

        if (slug) {
          // 1. Slug가 있으면 -> 공유 링크 조회
          detail = await fetchPortfolioBySlug(slug);
        } else {
          // 2. Slug가 없으면 -> 내 포트폴리오 조회 시도
          try {
            detail = await fetchMyPortfolio();
            if (!detail) {
              // 내 포트폴리오가 없음 -> 생성하기 UI 노출
              setIsNoPortfolio(true);
            }
          } catch (e) {
            // 로그인 안 된 상태 등 -> 기존처럼 Slug 필요 메시지 띄우거나 로그인 유도
            // 여기서는 단순히 에러 처리하지 않고, 데이터가 없으므로 "Slug 필요" 상태로 남둠
            // (만약 "로그인이 필요합니다"를 띄우고 싶다면 여기서 처리)
            setData(null);
          }
        }

        if (isCancelled) return;

        if (detail) {
          setData(detail);
          setLayout(detail.layoutType || "LIST");
        }
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
      const link = data?.owner && data.id
        ? await fetchShareLink(data.id)
        : window.location.href;

      await navigator.clipboard.writeText(link);
      alert("링크가 복사되었습니다!");
    } catch {
      alert("복사에 실패했습니다. 주소창의 링크를 직접 복사해주세요.");
    }
  };

  // [추가] 생성하기 버튼 핸들러
  const handleCreate = async () => {
    try {
      setLoading(true);
      // Step 1 API 호출로 ID 생성 (문서 참고)
      // 실제로는 생성 페이지로 이동하거나, 여기서 API 호출 후 수정 페이지로 이동
      // 여기서는 예시로 생성 페이지(/portfolio/edit)로 이동시킨다고 가정
      router.push("/portfolio/edit"); 
      
      // 만약 바로 API 호출이 필요하다면:
      // const newId = await createPortfolioDraft();
      // router.push(`/portfolio/edit?id=${newId}`);
    } catch (e) {
      alert("생성 페이지로 이동할 수 없습니다.");
    } finally {
      setLoading(false);
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
        {/* Case 1: Slug 없고 + 내 포트폴리오도 없음 -> 생성하기 UI */}
        {!slug && isNoPortfolio && !loading && (
          <div className={styles.stateBox}>
            <div className={styles.stateTitle}>포트폴리오가 존재하지 않습니다</div>
            <div className={styles.stateDesc}>
              나만의 멋진 명함을 만들어보세요!
            </div>
            <button className={styles.createBtn} onClick={handleCreate}>
              포트폴리오 생성하기
            </button>
          </div>
        )}

        {/* Case 2: Slug 없고 + 내 포트폴리오 조회 실패(로그인 안함 등) + 아직 데이터 없음 -> Slug 안내 */}
        {!slug && !isNoPortfolio && !data && !loading && (
          <div className={styles.stateBox}>
            <div className={styles.stateTitle}>공유 링크(slug)가 필요해요</div>
            <div className={styles.stateDesc}>
              URL 뒤에 <code className={styles.inlineCode}>?slug=8글자</code> 형태로 붙여서 접속해줘.
              <br />
              예) <code className={styles.inlineCode}>/portfolio?slug=ab12cd34</code>
            </div>
          </div>
        )}

        {loading && (
          <div className={styles.stateBox}>
            <div className={styles.stateTitle}>불러오는 중…</div>
            <div className={styles.stateDesc}>데이터를 가져오고 있어.</div>
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
            {layout === "CARD" && <CardView data={data} />}
            {layout === "LIST" && <ListView data={data} isOwner={data.owner} />}
            {layout === "GRID" && <GridView data={data} isOwner={data.owner} />}
          </>
        )}
      </div>
    </div>
  );
}