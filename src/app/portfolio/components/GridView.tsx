// src/app/portfolio/components/GridView.tsx

import styles from "../portfolio.module.css";
import type { PortfolioDetail } from "../page";

interface GridViewProps {
  data: PortfolioDetail;
  isOwner?: boolean;
}

export default function GridView({ data, isOwner = false }: GridViewProps) {
  const title = `${data.category}${data.subCategory ? ` · ${data.subCategory}` : ""}`;
  const intro = data.summaryIntro ?? "소개가 아직 없어요.";

  return (
    <div className={styles.gridContainer}>
      <header className={styles.gridHeaderRow}>
        <div className={styles.gridProfileCompact}>
          <img
            src={data.profileImg || "/default-avatar.png"}
            alt={title}
            className={styles.gridAvatarSmall}
          />
          <div className={styles.gridProfileContent}>
            <h1>{title}</h1>
            <span className={styles.gridRoleBadge}>
              {data.category}{data.subCategory ? ` | ${data.subCategory}` : ""}
            </span>
            <p className={styles.gridIntroSmall}>{intro}</p>
            <div className={styles.gridContactRow}>
              {data.location && <span className={styles.gridContactPill}>📍 {data.location}</span>}
              <span className={styles.gridContactPill}>✉️ {data.email}</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className={styles.gridGraphBox}>
            <div className={styles.graphHeader}>
              <span>방문자 통계</span>
              <span className={styles.highlight}>
                총 {data.totalViewCount ?? "-"} / 오늘 {data.todayViewCount ?? "-"}
              </span>
            </div>

            <div className={styles.graphBarsRow}>
              <div className={styles.gBarCol}><div className={styles.gBar} style={{ height: "30%" }}></div><span className={styles.gLabel}>Mon</span></div>
              <div className={styles.gBarCol}><div className={styles.gBar} style={{ height: "50%" }}></div><span className={styles.gLabel}>Tue</span></div>
              <div className={styles.gBarCol}><div className={styles.gBar} style={{ height: "20%" }}></div><span className={styles.gLabel}>Wed</span></div>
              <div className={styles.gBarCol}><div className={styles.gBar} style={{ height: "70%" }}></div><span className={styles.gLabel}>Thu</span></div>
              <div className={styles.gBarCol}><div className={`${styles.gBar} ${styles.active}`} style={{ height: "90%" }}></div><span className={styles.gLabel}>Today</span></div>
            </div>
          </div>
        )}
      </header>

      <main className={styles.gridProjects}>
        {data.projects.length === 0 ? (
          <div className={styles.emptyBox}>아직 등록된 프로젝트가 없어요.</div>
        ) : (
          data.projects.map((project, index) => {
            const mainLink = project.links && project.links.length > 0 ? project.links[0] : null;

            return (
              <article key={index} className={styles.gridProjectCard}>
                <div className={styles.projectThumbnail}>
                  <span style={{ fontSize: "50px" }}>
                    {index % 3 === 0 ? "🎨" : index % 3 === 1 ? "💻" : "📁"}
                  </span>
                </div>

                <div className={styles.gridProjectContent}>
                  <h3 className={styles.gridProjectTitle}>{project.title}</h3>
                  <p className={styles.gridProjectDesc}>{project.projectSummary}</p>

                  <div className={styles.gridProjectFooter}>
                    {mainLink ? (
                      <a
                        href={mainLink.url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.gridLinkBtn}
                      >
                        View Project ↗
                      </a>
                    ) : (
                      <span style={{ fontSize: "12px", color: "#aaa" }}>Coming Soon</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}
