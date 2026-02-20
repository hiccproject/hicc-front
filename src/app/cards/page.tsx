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
// - 작성 완료: 포트폴리오 상세 페이지로 이동
//
// 구현 안전장치
// - 토큰이 없으면 즉시 /login으로 리다이렉트
// - updatingMap으로 공개 상태 토글 중 중복 클릭 방지
// - 삭제/토글 버튼은 Link 내부에 있으므로 preventDefault + stopPropagation으로
//   링크 네비게이션이 먼저 실행되는 것을 차단
//
// 검토/개선 여지(중요)
// A) 상세 링크(cardLink)가 `/portfolio?id=${item.id}` 인데, 상세 페이지가 slug 기반이면 불일치 가능
//    - 현재는 shareSlugMap을 만들어두지만 실제 렌더링에서 사용하지 않음
//    - 상세가 slug 기반(`/portfolio/${slug}` or `/portfolio?slug=...`)이라면
//      shareSlugMap을 사용해 링크를 맞추는 게 안전
// B) 토큰 체크(getAccessToken) 후에도 apiFetch(auth:true)가 자체적으로 401/갱신을 처리한다면
//    - "토큰이 없으면 즉시 리다이렉트"가 UX적으로 맞긴 하지만, 중복 로직일 수 있음
//    - 유지해도 문제는 없지만 정책을 통일하면 코드가 더 단순해짐
// C) profile 이미지 소스 우선순위
//    - 현재는 item.profileImg 우선, 없으면 로컬 캐시(localProfileImg)
//    - 서버가 null을 내려주거나 늦게 반영되는 경우 로컬 캐시가 보강 역할을 잘 함
// D) MyPortfolioResponse 타입
//    - 배열 또는 {data: 배열}을 모두 허용하는 방어는 좋지만,
//      백엔드 응답 스펙이 확정되면 한 형태로 고정하는 편이 유지보수에 유리

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
// - 백엔드가 배열을 바로 내려주거나
// - { data: [...] } 형태로 감싸 내려줄 수 있어 둘 다 대응
type MyPortfolioResponse = PortfolioItem[] | { data: PortfolioItem[] };

export default function CardsPage() {
  const router = useRouter();

  // portfolios: 화면에 보여줄 명함 목록
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);

  // shareSlugMap: id -> slug 매핑
  // - 작성 완료된 명함에 대해 share link를 미리 불러와 캐싱하는 용도
  // - 현재 코드에서는 상세 링크에 사용하지 않고 있지만, slug 기반 라우팅이 필요해질 때 활용 가능
  const [shareSlugMap, setShareSlugMap] = useState<Record<number, string>>({});

  // 로딩/에러 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // updatingMap: 특정 id의 공개 상태 변경 중 여부
  // - 같은 카드에서 토글 연타를 막기 위한 플래그
  const [updatingMap, setUpdatingMap] = useState<Record<number, boolean>>({});

  // shareLink 응답이 "slug" 단독일 수도, "URL"일 수도 있으므로 마지막 path segment를 slug로 추출
  const extractSlug = (value: string) => {
    return value.trim().replace(/\/+$/, "").split("/").filter(Boolean).pop() || "";
  };

  // 작성 완료된 카드만 share link slug를 가져와서 id -> slug 매핑 생성
  // - 작성 중(lastStep < 5)은 공유 링크가 없거나 의미 없을 수 있어 제외
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
          // 개별 실패는 전체를 깨지 않도록 빈 slug로 처리
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

      // 토큰이 없으면 목록 조회 자체가 불가능하므로 로그인 페이지로 이동
      if (!token) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // apiFetch(auth:true)
        // - 기본 URL 조합 및 Authorization 헤더 처리
        // - 401 응답 시 토큰 갱신 로직이 있다면 내부에서 처리될 수 있음
        const response = await apiFetch<MyPortfolioResponse>("/api/portfolios/my", {
          method: "GET",
          auth: true,
        });

        // 응답 형태 통일(배열 또는 {data: 배열})
        const list = Array.isArray(response) ? response : response.data || [];

        setPortfolios(list);

        // share slug는 UI에서 즉시 필요하지 않더라도
        // 향후 상세 링크를 slug 기반으로 바꾸기 위해 미리 준비해두는 용도
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
  // - Link 내부 버튼이므로 네비게이션을 막고 처리해야 함
  const handleDelete = async (
    e: MouseEvent<HTMLButtonElement>,
    portfolioId: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      "이 명함을 삭제하시겠어요? 삭제 후 복구할 수 없습니다."
    );
    if (!confirmed) return;

    try {
      await deletePortfolio(portfolioId);

      // UI에서 즉시 제거
      setPortfolios((prev) => prev.filter((item) => item.id !== portfolioId));

      // 로컬 캐시 이미지도 같이 정리
      removePortfolioProfileImage(portfolioId);

      alert("명함이 삭제되었습니다.");
    } catch (err) {
      console.error("명함 삭제 에러:", err);
      alert("명함 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  // 공개/비공개 상태 토글
  // - 작성 완료(lastStep >= 5)인 경우에만 공개 가능
  // - updatingMap으로 중복 클릭 방지
  const handleToggleStatus = async (
    e: MouseEvent<HTMLButtonElement>,
    item: PortfolioItem
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (updatingMap[item.id]) return;

    const nextStatus = item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    // 작성이 완료되지 않은 DRAFT는 공개 전환 불가
    if (item.status === "DRAFT" && item.lastStep < 5) {
      alert("명함 작성이 완료된 후 공개할 수 있습니다.");
      return;
    }

    try {
      setUpdatingMap((prev) => ({ ...prev, [item.id]: true }));

      await updatePortfolioStatus(item.id, nextStatus);

      // 로컬 상태 즉시 반영
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
        {/* 페이지 헤더 + 새 명함 만들기 */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>내 명함 목록</h1>
            <p className={styles.pageDesc}>
              만들어진 포트폴리오 명함을 관리하고 공유하세요.
            </p>
          </div>

          <Link href="/create" className={`${styles.btn} ${styles.btnPrimary}`}>
            + 새 명함 만들기
          </Link>
        </div>

        {/* 로딩 상태 */}
        {loading && <div className={styles.loadingState}>불러오는 중...</div>}

        {/* 에러 상태(구체 메시지 표시 + 새로고침 버튼) */}
        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className={styles.retryBtn}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && portfolios.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📇</div>
            <p className={styles.emptyText}>아직 생성된 명함이 없습니다.</p>
            <Link href="/create" className={`${styles.btn} ${styles.btnPrimary}`}>
              첫 번째 명함 만들기
            </Link>
          </div>
        )}

        {/* 카드 리스트 */}
        <div className={styles.grid}>
          {portfolios.map((item) => {
            // title이 비정상 값("null - null")인 케이스를 UI에서 방어
            const displayTitle =
              !item.title || item.title === "null - null"
                ? "제목 없는 명함"
                : item.title;

            const isDraft = item.status === "DRAFT";
            const isComplete = (item.lastStep || 0) >= 5;
            const isUpdating = updatingMap[item.id];

            // 작성 중인 경우 다음 step으로 이어서 작성
            const nextStep = item.lastStep || 1;

            // 상세 링크 정책
            // - 작성 중이면 create로 이동
            // - 작성 완료면 상세 페이지로 이동
            //
            // 주의: 상세가 slug 기반이면 `/portfolio?id=`는 맞지 않을 수 있음
            //       (shareSlugMap을 사용하도록 바꾸는 개선이 가능)
            const cardLink =
              isDraft && !isComplete
                ? `/create?portfolioId=${item.id}&step=${nextStep}`
                : `/portfolio?id=${item.id}`;

            // 로컬 캐시 프로필 이미지를 서버 값이 없을 때 fallback으로 사용
            const localProfileImg = getPortfolioProfileImage(item.id);

            return (
              <Link key={item.id} href={cardLink} className={styles.card}>
                {/* 상태 뱃지 */}
                <div className={styles.statusGroup}>
                  <span
                    className={`${styles.badge} ${
                      isDraft ? styles.badgeDraft : styles.badgePublished
                    }`}
                  >
                    {isDraft ? (isComplete ? "비공개됨" : "작성 중") : "공개됨"}
                  </span>

                  {/* 작성 중이면 현재 단계 표시 */}
                  {item.lastStep < 5 && isDraft && (
                    <span className={styles.stepInfo}>
                      단계 {item.lastStep}/5
                    </span>
                  )}
                </div>

                {/* 액션 버튼 영역 */}
                <div className={styles.cardActions}>
                  {/* 공개/비공개 토글 */}
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
                    <span className={styles.toggleLabel}>
                      {isDraft ? "비공개" : "공개"}
                    </span>
                    <span className={styles.toggleTrack}>
                      <span className={styles.toggleThumb} />
                    </span>
                  </button>

                  {/* 수정: edit 모드로 create 진입 */}
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

                  {/* 삭제 */}
                  <button
                    type="button"
                    className={`${styles.cardActionBtn} ${styles.deleteBtn}`}
                    onClick={(e) => handleDelete(e, item.id)}
                  >
                    삭제
                  </button>
                </div>

                {/* 본문(썸네일 + 제목) */}
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

                {/* 하단(업데이트 날짜 + CTA) */}
                <div className={styles.cardFooter}>
                  <span className={styles.date}>
                    {formatDate(item.updatedAt)} 업데이트
                  </span>
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