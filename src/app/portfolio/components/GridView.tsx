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
            <div className={styles.gridContactPill}>메일 {data.email}</div>
            {data.phone && <div className={styles.gridContactPill}>전화 {data.phone}</div>}
            {data.location && <div className={styles.gridContactPill}>지역 {data.location}</div>}
          </div>
        </div>

        {isOwner && (
          <div className={styles.gridStatsCard}>
            <div className={styles.statMetaRow}>
              <span>일일 조회수 :</span>
              <span>전체 조회수 :</span>
            </div>
            <div className={styles.statNumRow}>
              <span className={styles.statToday}>{data.todayViewCount ?? 0}회</span>
              <span className={styles.statTotal}>{data.totalViewCount ?? 0}회</span>
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
