import styles from "../portfolio.module.css";
import type { PortfolioDetail } from "../page";

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

interface GridViewProps {
  data: PortfolioDetail;
  isOwner?: boolean;
}

export default function GridView({ data, isOwner = false }: GridViewProps) {
  const name = data.username || "이름";
  const role = data.subCategory || "직무";
  const intro = data.summaryIntro || "안녕하세요! 소개 문구를 입력해 주세요.";

  return (
    <section className={styles.gridContainer}>
      <div className={styles.gridTop}>
        <div className={styles.gridProfileArea}>
          <div className={styles.gridIdentityRow}>
            <img
              src={data.profileImg || DEFAULT_PROFILE_IMG}
              alt={name}
              className={styles.gridAvatarSmall}
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).src = DEFAULT_PROFILE_IMG;
              }}
            />
            <div>
              <h2 className={styles.gridName}>{name}</h2>
              <span className={styles.gridRoleBadge}>{role}</span>
            </div>
          </div>

          <p className={styles.gridIntro}>{intro}</p>

          <div className={styles.gridContactRow}>
            <div className={styles.gridContactPill}>
              <MailIcon /> {data.email}
            </div>
            {data.phone && (
              <div className={styles.gridContactPill}>
                <PhoneIcon /> {data.phone}
              </div>
            )}
            {data.location && (
              <div className={styles.gridContactPill}>
                <MapPinIcon /> {data.location}
              </div>
            )}
          </div>
        </div>

        {isOwner && (
          <div className={styles.gridStatsCard}>
            <div className={styles.cardStatsRow} style={{ marginTop: 0 }}>
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
      </div>

      <div className={styles.gridProjectsTitle}>
        <span className={styles.gridProjectsCount}>{data.projects.length}</span>
        <span className={styles.gridProjectsLabel}>개의 프로젝트</span>
      </div>

      <div className={styles.gridProjects}>
        {data.projects.length === 0 && <div className={styles.emptyBox}>아직 등록된 프로젝트가 없습니다.</div>}

        {data.projects.map((project, index) => {
          const mainLink = project.links && project.links.length > 0 ? project.links[0] : null;
          const tagLabel = project.title?.split(" ")[0] || "Project";

          return (
            <article key={`${project.title}-${index}`} className={styles.gridProjectCard}>
              <div className={styles.gridProjectImageWrap}>
                {project.image && <img src={project.image} alt={project.title} className={styles.gridProjectImage} />}
                <span className={styles.projectTagChip}>{tagLabel}</span>
              </div>

              <div className={styles.gridProjectBody}>
                <h3 className={styles.gridProjectTitle}>{project.title || "프로젝트"}</h3>
                <p className={styles.gridProjectDesc}>{project.projectSummary || "프로젝트 소개를 입력해 주세요."}</p>

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
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}