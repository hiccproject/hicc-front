"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./cards.module.css";
import Header from "@/components/Header";
import { getAccessToken } from "@/lib/auth/tokens";

// API 응답 데이터 타입 정의
type PortfolioItem = {
  id: number;
  title: string;
  profileImg: string | null;
  status: "DRAFT" | "PUBLISHED";
  lastStep: number;
  updatedAt: string;
};

export default function CardsPage() {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyPortfolios() {
      const token = getAccessToken();

      // 토큰이 없으면 로그인 페이지로 리다이렉트
      if (!token) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }

      try {
        setLoading(true);
        // API 호출
        const res = await fetch("/api/portfolios/my", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // 헤더에 토큰 추가
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("명함 목록을 불러오지 못했습니다.");
        }

        const json = await res.json();
        // 응답이 배열 형태라고 가정 (제공해주신 예시 참고)
        const list = Array.isArray(json) ? json : json.data || [];
        setPortfolios(list);
      } catch (err) {
        console.error(err);
        setError("데이터를 불러오는 도중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchMyPortfolios();
  }, [router]);

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className={styles.container}>
      <Header />
      
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>내 명함 목록</h1>
            <p className={styles.pageDesc}>
              만들어진 포트폴리오 명함을 관리하고 공유하세요.
            </p>
          </div>
          
          {/* 메인 페이지 스타일을 참고한 CTA 버튼 */}
          <Link href="/create" className={`${styles.btn} ${styles.btnPrimary}`}>
            + 새 명함 만들기
          </Link>
        </div>

        {loading && <div className={styles.loadingState}>불러오는 중...</div>}
        
        {error && <div className={styles.errorState}>{error}</div>}

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
            // 제목이 "null - null" 이거나 비어있으면 기본값 표시
            const displayTitle = (!item.title || item.title === "null - null") 
              ? "제목 없는 명함" 
              : item.title;

            // 상태에 따른 뱃지 스타일
            const isDraft = item.status === "DRAFT";
            
            // 링크 로직: 
            // DRAFT -> 작성 페이지(create)로 이동 (step 파라미터 포함)
            // PUBLISHED -> 상세 조회 페이지로 이동 (slug가 없으므로 id 사용, 추후 slug로 변경 권장)
            const cardLink = isDraft 
              ? `/create?portfolioId=${item.id}&step=${item.lastStep || 1}`
              : `/portfolio?id=${item.id}`; // API에 slug가 추가되면 `?slug=${item.slug}`로 변경

            return (
              <Link key={item.id} href={cardLink} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={`${styles.badge} ${isDraft ? styles.badgeDraft : styles.badgePublished}`}>
                    {isDraft ? "작성 중" : "공개됨"}
                  </span>
                  {item.lastStep < 5 && isDraft && (
                    <span className={styles.stepInfo}>단계 {item.lastStep}/5</span>
                  )}
                </div>
                
                <div className={styles.cardBody}>
                  <div className={styles.cardThumb}>
                    {item.profileImg ? (
                      <img src={item.profileImg} alt="프로필" className={styles.thumbImg} />
                    ) : (
                      <div className={styles.thumbPlaceholder}>No Image</div>
                    )}
                  </div>
                  <h2 className={styles.cardTitle}>{displayTitle}</h2>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.date}>
                    {formatDate(item.updatedAt)} 업데이트
                  </span>
                  <span className={styles.actionText}>
                    {isDraft ? "이어 만들기 →" : "보러 가기 →"}
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