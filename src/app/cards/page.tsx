//src/app/cards/page.tsx
"use client";

import { MouseEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./cards.module.css";
import Header from "@/components/Header";
import { getAccessToken } from "@/lib/auth/tokens";
import { deletePortfolio } from "@/lib/api/cards";

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
        setError(null);

        // API 호출
        const res = await fetch("/api/portfolios/my", {
          method: "GET",
          // [중요] 쿠키와 헤더 모두 포함 (서버 설정에 따라 둘 중 하나가 필수일 수 있음)
          credentials: "include", 
          headers: {
            Authorization: `Bearer ${token}`, 
            Accept: "application/json",
          },
        });

        // 응답 본문을 텍스트로 먼저 읽어서 JSON 파싱 에러 방지
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          // JSON이 아닌 경우 (예: 404 HTML 페이지 등)
          throw new Error(`서버 응답이 올바르지 않습니다. (Status: ${res.status})`);
        }

        if (!res.ok) {
          // 서버에서 보내준 에러 메시지가 있으면 사용, 없으면 상태 코드 표시
          throw new Error(json.message || `요청 실패 (${res.status})`);
        }

        // 응답이 배열 형태라고 가정 (제공해주신 예시 참고)
        // 만약 { data: [...] } 형태라면 json.data 사용
        const list = Array.isArray(json) ? json : json.data || [];
        setPortfolios(list);

      } catch (err) {
        console.error("명함 목록 조회 에러:", err);
        // [수정] 실제 에러 메시지를 화면에 표시
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchMyPortfolios();
  }, [router]);

  // 날짜 포맷팅 함수


  const handleDelete = async (e: MouseEvent<HTMLButtonElement>, portfolioId: number) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm("이 명함을 삭제하시겠어요? 삭제 후 복구할 수 없습니다.");
    if (!confirmed) return;

    try {
      await deletePortfolio(portfolioId);
      setPortfolios((prev) => prev.filter((item) => item.id !== portfolioId));
      alert("명함이 삭제되었습니다.");
    } catch (err) {
      console.error("명함 삭제 에러:", err);
      alert("명함 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
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
          
          <Link href="/create" className={`${styles.btn} ${styles.btnPrimary}`}>
            + 새 명함 만들기
          </Link>
        </div>

        {loading && <div className={styles.loadingState}>불러오는 중...</div>}
        
        {/* 에러 발생 시 구체적인 메시지 표시 */}
        {error && (
          <div className={styles.errorState}>
            <p>⚠️ {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className={styles.retryBtn}
            >
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
            const displayTitle = (!item.title || item.title === "null - null") 
              ? "제목 없는 명함" 
              : item.title;

            const isDraft = item.status === "DRAFT";
            
            // 링크: 작성 중이면 create 페이지, 완료되면 조회 페이지
            // step이 0이거나 없을 경우 1로 기본 설정
            const nextStep = item.lastStep || 1;
            const cardLink = isDraft 
              ? `/create?portfolioId=${item.id}&step=${nextStep}`
              : `/portfolio?id=${item.id}`; // 추후 slug가 생기면 ?slug=${item.slug}로 변경

            return (
              <Link key={item.id} href={cardLink} className={styles.card}>
                <div className={styles.cardActions}>
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