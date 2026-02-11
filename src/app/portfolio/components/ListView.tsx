import { useState } from "react";
import styles from "../portfolio.module.css";
import type { PortfolioDetail, ProjectLink } from "../page";

const DEFAULT_PROFILE_IMG = "/default-avatar.png";

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
            <div className={styles.sideContactItem}>메일 {data.email}</div>
            {data.phone && <div className={styles.sideContactItem}>전화 {data.phone}</div>}
            {data.location && <div className={styles.sideContactItem}>지역 {data.location}</div>}
          </div>
        </div>

        {isOwner && (
          <div className={styles.sideStatsCard}>
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
