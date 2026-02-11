import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../portfolio.module.css";
import type { PortfolioDetail, Project } from "../page";

interface CardViewProps {
  data: PortfolioDetail;
  canViewStats?: boolean;
}

const DEFAULT_PROFILE_IMG = "/default-avatar.png";

type CardSlide =
  | { key: string; type: "profile" }
  | { key: string; type: "stats" }
  | { key: string; type: "project"; project: Project };

function buildSlides(data: PortfolioDetail, canViewStats: boolean): CardSlide[] {
  const slides: CardSlide[] = [{ key: "profile", type: "profile" }];

  if (canViewStats) {
    slides.push({ key: "stats", type: "stats" });
  }

  data.projects.forEach((project, index) => {
    slides.push({ key: `project-${index}`, type: "project", project });
  });

  return slides;
}

function safeText(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export default function CardView({ data, canViewStats = false }: CardViewProps) {
  const name = safeText(data.username, "이름");
  const role = safeText(data.subCategory, "직무");
  const intro = safeText(data.summaryIntro, "안녕하세요! 소개 문구를 입력해 주세요.");

  const slides = useMemo(() => buildSlides(data, canViewStats), [data, canViewStats]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const swipeStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  useEffect(() => {
    setCurrentIndex(0);
  }, [data.id, slides.length]);

  const slideCount = slides.length;
  const currentSlide = slides[currentIndex] ?? slides[0];
  const canMove = slideCount > 1;

  const goPrev = () => {
    if (!canMove) return;
    setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount);
  };

  const goNext = () => {
    if (!canMove) return;
    setCurrentIndex((prev) => (prev + 1) % slideCount);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    swipeStartRef.current = { x: event.clientX, y: event.clientY, active: true };
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (!swipeStartRef.current?.active || !canMove) return;
    const deltaX = event.clientX - swipeStartRef.current.x;
    const deltaY = event.clientY - swipeStartRef.current.y;
    swipeStartRef.current.active = false;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    }
  };

  const handlePointerCancel = () => {
    if (swipeStartRef.current) swipeStartRef.current.active = false;
  };

  const renderProfileSlide = () => (
    <>
      <div className={styles.cardProfileGroup}>
        <img
          src={data.profileImg || DEFAULT_PROFILE_IMG}
          alt={name}
          className={styles.cardAvatarLarge} 
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).src = DEFAULT_PROFILE_IMG;
          }}
        />
        
        <div className={styles.cardIdentityColumn}>
          <div className={styles.cardNameRow}>
             <h2 className={styles.cardName}>{name}</h2>
             <span className={styles.cardRolePill}>{role}</span>
          </div>
        </div>
      </div>

      <p className={styles.cardIntro}>{intro}</p>

      <div className={styles.cardContactList}>
        <div className={styles.cardContactItem}>
            {/* 아이콘 추가 가능 */}
            <span className={styles.contactIcon}>메일 </span> {data.email}
        </div>
        {data.phone && (
            <div className={styles.cardContactItem}>
                <span className={styles.contactIcon}>전화 </span> {data.phone}
            </div>
        )}
        {data.location && (
            <div className={styles.cardContactItem}>
                <span className={styles.contactIcon}>지역 </span> {data.location}
            </div>
        )}
      </div>
    </>
  );

  const renderStatsSlide = () => {
    return (
      <>
        <div className={styles.cardProfileGroup}>
          <img
            src={data.profileImg || DEFAULT_PROFILE_IMG}
            alt={name}
            className={styles.cardAvatarLarge} 
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).src = DEFAULT_PROFILE_IMG;
            }}
          />
          <div className={styles.cardIdentityColumn}>
            <div className={styles.cardNameRow}>
               <h2 className={styles.cardName}>{name}</h2>
               <span className={styles.cardRolePill}>{role}</span>
            </div>
          </div>
        </div>

        <p className={styles.cardIntro}>{intro}</p>

        <div className={styles.cardChartPanel}>
          <div className={styles.cardStatsRow}>
            <div className={styles.cardStatsItem}>
              <span className={styles.cardStatsLabel}>일일 조회수 :</span>
              <strong className={styles.cardStatsValue}>
                {data.todayViewCount ?? 0}
                <span className={styles.cardStatsUnit}>회</span>
              </strong>
            </div>
            <div className={styles.cardStatsItem}>
              <span className={styles.cardStatsLabel}>전체 조회수 :</span>
              <strong className={styles.cardStatsValue}>
                {data.totalViewCount ?? 0}
                <span className={styles.cardStatsUnit}>회</span>
              </strong>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderProjectSlide = (project: Project) => {
    const title = safeText(project.title, "프로젝트");
    const summary = safeText(project.projectSummary, "프로젝트 설명을 입력해 주세요.");
    const links = Array.isArray(project.links) ? project.links.filter((item) => item?.url) : [];
    const mainLink = links[0] ?? null;
    const extraCount = Math.max(links.length - 1, 0);
    const tag = safeText(data.subCategory, "PROJECT");

    return (
      <article className={styles.cardProjectSlide}>
        <div className={styles.cardProjectImageWrap}>
          {project.image ? <img src={project.image} alt={title} className={styles.cardProjectImage} /> : null}
          <span className={styles.cardProjectBadge}>{tag}</span>
        </div>

        <div className={styles.cardProjectLinkBar}>
          {mainLink ? (
            <a href={mainLink.url} target="_blank" rel="noreferrer" className={styles.cardProjectLink}>
              {mainLink.url}
            </a>
          ) : (
            <div className={styles.cardProjectLink}>등록된 링크가 없습니다.</div>
          )}
          <span className={styles.cardProjectLinkTail}>{extraCount > 0 ? `+${extraCount}` : "v"}</span>
        </div>

        <h3 className={styles.cardProjectTitle}>{title}</h3>
        <p className={styles.cardProjectDesc}>{summary}</p>
      </article>
    );
  };

  return (
    <div className={styles.cardStage}>
      <button
        type="button"
        className={`${styles.carouselArrow} ${!canMove ? styles.cardArrowHidden : ""}`}
        onClick={goPrev}
        aria-label="이전 카드"
      >
        &lt;
      </button>

      <section
        className={styles.homeCardStyle}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className={styles.cardSlideMeta}>
          {currentIndex + 1} / {slideCount}
        </div>

        {currentSlide.type === "profile" && renderProfileSlide()}
        {currentSlide.type === "stats" && renderStatsSlide()}
        {currentSlide.type === "project" && renderProjectSlide(currentSlide.project)}
      </section>

      <button
        type="button"
        className={`${styles.carouselArrow} ${!canMove ? styles.cardArrowHidden : ""}`}
        onClick={goNext}
        aria-label="다음 카드"
      >
        &gt;
      </button>
    </div>
  );
}
