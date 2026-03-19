// src/app/cards/page.tsx
//
// 내 명함 목록 페이지
// - 로그인한 사용자의 포트폴리오(명함) 목록을 조회해 카드 형태로 보여줌
// - 각 명함에 대해 다음 기능을 제공
//   1) 작성 중이면 이어 만들기(create로 이동)
//   2) 작성 완료면 상세 보기(portfolio로 이동)
//   3) 공개/비공개 토글(updatePortfolioStatus)
//   4) 수정(create?mode=edit로 이동)
//   5) 삭제(deletePortfolio)
//
// 데이터/라우팅 정책
// - 목록 조회: GET /api/portfolios/my (auth 필요)
// - 작성 중(DRAFT + lastStep < 5): create 단계로 이동
// - 작성 완료: 포트폴리오 상세 페이지(slug 기반)로 이동
//
// 구현 안전장치
// - 토큰이 없으면 즉시 메인(/)으로 리다이렉트
// - updatingMap으로 공개 상태 토글 중 중복 클릭 방지
// - 삭제/토글 버튼은 Link 내부에 있으므로 preventDefault + stopPropagation으로
//   링크 네비게이션이 먼저 실행되는 것을 차단

"use client";

import { MouseEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./cards.module.css";
import Header from "@/components/Header";
import { getAccessToken } from "@/lib/auth/tokens";
import {
  deletePortfolio,
  getPortfolioShareLink,
  updatePortfolioStatus,
} from "@/lib/api/cards";
import {
  getPortfolioProfileImage,
  removePortfolioProfileImage,
} from "@/lib/storage/portfolio-images";
import { apiFetch } from "@/lib/api/client";

// 목록에서 사용할 포트폴리오(명함) 아이템 타입
type PortfolioItem = {
  id: number;
  title: string;
  profileImg: string | null;
  status: "DRAFT" | "PUBLISHED";
  lastStep: number;
  updatedAt: string;
};

// 내 명함 목록 응답 타입
type MyPortfolioResponse = PortfolioItem[] | { data: PortfolioItem[] };

export default function CardsPage() {
  const router = useRouter();

  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [shareSlugMap, setShareSlugMap] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [updatingMap, setUpdatingMap] = useState<Record<number, boolean>>({});

  // shareLink 응답이 "slug" 단독일 수도, "URL"일 수도 있으므로 마지막 path segment를 slug로 추출
  const extractSlug = (value: string) => {
    return value.trim().replace(/\/+$/, "").split("/").filter(Boolean).pop() || "";
  };

  // 작성 완료된 카드만 share link slug를 가져와서 id -> slug 매핑 생성
  const fetchShareSlugs = async (list: PortfolioItem[]) => {
    const targets = list.filter(
      (item) => !(item.status === "DRAFT" && (item.lastStep || 0) < 5)
    );

    if (targets.length === 0) {
      setShareSlugMap({});
      return;
    }

    const entries = await Promise.all(
      targets.map(async (item) => {
        try {
          const shareRes = await getPortfolioShareLink(item.id);
          const raw = shareRes?.data?.trim() || "";
          const slug = extractSlug(raw);
          return [item.id, slug] as const;
        } catch {
          return [item.id, ""] as const;
        }
      })
    );

    const nextMap = entries.reduce<Record<number, string>>((acc, [id, slug]) => {
      if (slug) acc[id] = slug;
      return acc;
    }, {});

    setShareSlugMap(nextMap);
  };

  // 최초 진입 시 내 명함 목록 조회
  useEffect(() => {
    async function fetchMyPortfolios() {
      const token = getAccessToken();

      // ✅ 토큰이 없으면 메인(/)으로 이동
      if (!token) {
        alert("로그인이 필요합니다.");
        router.replace("/"); // push 대신 replace 권장(뒤로가기로 다시 오지 않게)
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await apiFetch<MyPortfolioResponse>("/api/portfolios/my", {
          method: "GET",
          auth: true,
        });

        const list = Array.isArray(response) ? response : response.data || [];
        setPortfolios(list);

        // ✅ slug 기반 상세 링크를 위해 미리 slug 매핑 생성
        await fetchShareSlugs(list);
      } catch (err) {
        console.error("명함 목록 조회 에러:", err);
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchMyPortfolios();
  }, [router]);

  // updatedAt 표시용 날짜 포맷
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 명함 삭제
  const handleDelete = async (e: MouseEvent<HTMLButtonElement>, portfolioId: number) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      "이 명함을 삭제하시겠어요? 삭제 후 복구할 수 없습니다."
    );
    if (!confirmed) return;

    try {
      await deletePortfolio(portfolioId);

      setPortfolios((prev) => prev.filter((item) => item.id !== portfolioId));
      removePortfolioProfileImage(portfolioId);

      // ✅ slug map에서도 제거
      setShareSlugMap((prev) => {
        const next = { ...prev };
        delete next[portfolioId];
        return next;
      });

      alert("명함이 삭제되었습니다.");
    } catch (err) {
      console.error("명함 삭제 에러:", err);
      alert("명함 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  // 공개/비공개 상태 토글
  const handleToggleStatus = async (
    e: MouseEvent<HTMLButtonElement>,
    item: PortfolioItem
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (updatingMap[item.id]) return;

    const nextStatus = item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    if (item.status === "DRAFT" && item.lastStep < 5) {
      alert("명함 작성이 완료된 후 공개할 수 있습니다.");
      return;
    }

    try {
      setUpdatingMap((prev) => ({ ...prev, [item.id]: true }));

      await updatePortfolioStatus(item.id, nextStatus);

      setPortfolios((prev) =>
        prev.map((portfolio) =>
          portfolio.id === item.id ? { ...portfolio, status: nextStatus } : portfolio
        )
      );
    } catch (err) {
      console.error("공개 상태 변경 에러:", err);
      alert("공개 상태 변경에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setUpdatingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerWrap}>
        <Header />
      </div>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>내 명함 목록</h1>
            <p className={styles.pageDesc}>만들어진 포트폴리오 명함을 관리하고 공유하세요.</p>
          </div>

          <Link href="/create" className={`${styles.btn} ${styles.btnPrimary}`}>
            + 새 명함 만들기
          </Link>
        </div>

        {loading && <div className={styles.loadingState}>불러오는 중...</div>}

        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className={styles.retryBtn}>
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && portfolios.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📇</div>
            <p className={styles.emptyText}>아직 생성된 명함이 없습니다.</p>
            <Link href="/create" className={`${styles.btn} ${styles.btnPrimary}`}>
              첫 번째 명함 만들기
            </Link>
          </div>
        )}

        <div className={styles.grid}>
          {portfolios.map((item) => {
            const displayTitle =
              !item.title || item.title === "null - null" ? "제목 없는 명함" : item.title;

            const isDraft = item.status === "DRAFT";
            const isComplete = (item.lastStep || 0) >= 5;
            const isUpdating = updatingMap[item.id];

            const nextStep = item.lastStep || 1;

            // ✅ 상세 페이지는 query 기반 라우트(/portfolio?slug=...)를 사용
            // - 작성 중이면 create로 이동
            // - 작성 완료면 slug가 있으면 slug query로 이동
            // - slug가 없으면 id query로 fallback
            const slug = shareSlugMap[item.id];
            const portfolioDetailLink = slug
              ? `/portfolio?slug=${encodeURIComponent(slug)}`
              : `/portfolio?id=${item.id}`;

            const cardLink =
              isDraft && !isComplete
                ? `/create?portfolioId=${item.id}&step=${nextStep}`
                : portfolioDetailLink;

            const localProfileImg = getPortfolioProfileImage(item.id);

            return (
              <Link key={item.id} href={cardLink} className={styles.card}>
                <div className={styles.statusGroup}>
                  <span
                    className={`${styles.badge} ${
                      isDraft ? styles.badgeDraft : styles.badgePublished
                    }`}
                  >
                    {isDraft ? (isComplete ? "비공개됨" : "작성 중") : "공개됨"}
                  </span>

                  {item.lastStep < 5 && isDraft && (
                    <span className={styles.stepInfo}>단계 {item.lastStep}/5</span>
                  )}
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isDraft}
                    aria-label="명함 공개 여부 변경"
                    className={`${styles.visibilityToggle} ${
                      !isDraft ? styles.visibilityOn : ""
                    }`}
                    onClick={(e) => handleToggleStatus(e, item)}
                    disabled={isUpdating}
                  >
                    <span className={styles.toggleLabel}>{isDraft ? "비공개" : "공개"}</span>
                    <span className={styles.toggleTrack}>
                      <span className={styles.toggleThumb} />
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.cardActionBtn} ${styles.editBtn}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/create?portfolioId=${item.id}&mode=edit`);
                    }}
                  >
                    수정
                  </button>

                  <button
                    type="button"
                    className={`${styles.cardActionBtn} ${styles.deleteBtn}`}
                    onClick={(e) => handleDelete(e, item.id)}
                  >
                    삭제
                  </button>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardThumb}>
                    {item.profileImg || localProfileImg ? (
                      <img
                        src={item.profileImg || localProfileImg}
                        alt="프로필"
                        className={styles.thumbImg}
                      />
                    ) : (
                      <div className={styles.thumbPlaceholder}>No Image</div>
                    )}
                  </div>

                  <h2 className={styles.cardTitle}>{displayTitle}</h2>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.date}>{formatDate(item.updatedAt)} 업데이트</span>
                  <span className={styles.actionText}>
                    {isDraft && !isComplete ? "이어 만들기 →" : "보러 가기 →"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
