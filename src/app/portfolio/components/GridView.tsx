import styles from "../portfolio.module.css";
import type { PortfolioDetail } from "../page";

const DEFAULT_PROFILE_IMG = "/default-avatar.png";

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
              <span className={`${styles.contactIcon} ${styles.contactIconMail}`} aria-hidden />
              <span>{data.email}</span>
            </div>
            {data.phone && (
              <div className={styles.gridContactPill}>
                <span className={`${styles.contactIcon} ${styles.contactIconPhone}`} aria-hidden />
                <span>{data.phone}</span>
              </div>
            )}
            {data.location && (
              <div className={styles.gridContactPill}>
                <span className={`${styles.contactIcon} ${styles.contactIconLocation}`} aria-hidden />
                <span>{data.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* [수정 부분] 카드뷰와 동일한 스타일 적용 */}
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
