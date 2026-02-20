import { useState } from "react";
import styles from "../portfolio.module.css";
import type { PortfolioDetail, ProjectLink } from "../page";

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

interface ListViewProps {
  data: PortfolioDetail;
  isOwner?: boolean;
}

function normalizeLinks(links?: ProjectLink[]): ProjectLink[] {
  return Array.isArray(links) ? links.filter((item) => item?.url) : [];
}

export default function ListView({ data, isOwner = false }: ListViewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const name = data.username || "이름";
  const role = data.subCategory || "직무";
  const intro = data.summaryIntro || "안녕하세요! 소개 문구를 입력해 주세요.";

  return (
    <div className={styles.listLayout}>
      <aside className={styles.listAside}>
        <div className={styles.sideProfileCard}>
          <img
            src={data.profileImg || DEFAULT_PROFILE_IMG}
            alt={name}
            className={styles.avatar}
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).src = DEFAULT_PROFILE_IMG;
            }}
          />

          <div className={styles.sideNameRow}>
            <h2 className={styles.sideName}>{name}</h2>
            <span className={styles.sideRole}>{role}</span>
          </div>

          <p className={styles.sideIntro}>{intro}</p>

          <div className={styles.sideContactList}>
            <div className={styles.sideContactItem}>
              <MailIcon /> {data.email}
            </div>
            {data.phone && (
              <div className={styles.sideContactItem}>
                <PhoneIcon /> {data.phone}
              </div>
            )}
            {data.location && (
              <div className={styles.sideContactItem}>
                <MapPinIcon /> {data.location}
              </div>
            )}
          </div>
        </div>

        {isOwner && (
          <div 
            className={styles.cardChartPanel} 
            style={{ marginTop: "30px", background: "#ffffff" }}
          >
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
        )}
      </aside>

      <main className={styles.listMain}>
        {data.projects.length === 0 && <div className={styles.emptyBox}>아직 등록된 프로젝트가 없습니다.</div>}

        {data.projects.map((project, index) => {
          const links = normalizeLinks(project.links);
          const mainLink = links[0];
          const subLinks = links.slice(1);
          const isOpen = expandedIndex === index;

          return (
            <article key={`${project.title}-${index}`} className={styles.projectRow}>
              <div className={styles.projectThumbWrap}>
                {project.image && <img src={project.image} alt={project.title} className={styles.projectThumb} />}
              </div>

              <div className={styles.projectBody}>
                <h3 className={styles.projectTitle}>{project.title || "프로젝트"}</h3>
                <p className={styles.projectDesc}>{project.projectSummary || "프로젝트 소개를 입력해 주세요."}</p>

                <div className={styles.linkWrapper}>
                  <div className={styles.mainLinkBlock}>
                    {mainLink ? (
                      <a href={mainLink.url} target="_blank" rel="noreferrer" className={styles.mainLinkAnchor}>
                        <span className={styles.linkIcon}>링크</span>
                        <span>{mainLink.url}</span>
                      </a>
                    ) : (
                      <div className={styles.mainLinkAnchor}>
                        <span className={styles.linkIcon}>링크</span>
                        <span>등록된 링크 없음</span>
                      </div>
                    )}

                    {subLinks.length > 0 && (
                      <button
                        type="button"
                        className={styles.expandBtn}
                        onClick={() => setExpandedIndex(isOpen ? null : index)}
                        aria-label="추가 링크 열기"
                      >
                        {isOpen ? "˄" : "˅"}
                      </button>
                    )}
                  </div>

                  {isOpen && subLinks.length > 0 && (
                    <div className={styles.subLinksList}>
                      {subLinks.map((link, linkIndex) => (
                        <a
                          key={`${link.url}-${linkIndex}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.subLinkItem}
                        >
                          {link.title || `추가 링크 ${linkIndex + 1}`}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}