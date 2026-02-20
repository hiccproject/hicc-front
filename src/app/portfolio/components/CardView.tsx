import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../portfolio.module.css";
import type { PortfolioDetail, Project } from "../page";

interface CardViewProps {
  data: PortfolioDetail;
  canViewStats?: boolean;
}

const DEFAULT_PROFILE_IMG = "/default-avatar.png";

const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

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
            <MailIcon /> {data.email}
        </div>
        {data.phone && (
            <div className={styles.cardContactItem}>
                <PhoneIcon /> {data.phone}
            </div>
        )}
        {data.location && (
            <div className={styles.cardContactItem}>
                <MapPinIcon /> {data.location}
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