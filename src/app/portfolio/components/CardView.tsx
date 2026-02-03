// src/app/portfolio/components/CardView.tsx

import styles from "../portfolio.module.css";
import type { PortfolioDetail } from "../page";

interface CardViewProps {
  data: PortfolioDetail;
}

export default function CardView({ data }: CardViewProps) {
  const title = `${data.category}${data.subCategory ? ` · ${data.subCategory}` : ""}`;
  const tags = [data.category, data.subCategory, data.location].filter(Boolean);

  return (
    <div className={styles.homeCardStyle}>
      <img
        src={data.profileImg || "/default-avatar.png"}
        alt={title}
        className={styles.cardAvatarCircle}
      />

      <div className={styles.cardHeader}>
        <h4 className={styles.cardName}>{title}</h4>
        <div className={styles.cardRole}>
          업데이트: {new Date(data.updatedAt).toLocaleDateString()}
        </div>
      </div>

      <p className={styles.cardIntro}>{data.summaryIntro ?? "소개가 아직 없어요."}</p>

      <div className={styles.cardTags}>
        {tags.map((tag, idx) => (
          <span key={idx} className={styles.cardTagSpan}>
            {tag}
          </span>
        ))}
        {data.email && <span className={styles.cardTagSpan}>✉️ {data.email}</span>}
        {data.phone && <span className={styles.cardTagSpan}>📞 {data.phone}</span>}
      </div>

      <div className={styles.cardLinksArea}>
        {data.projects.length === 0 && (
          <div className={styles.emptyBox}>프로젝트가 아직 없어요.</div>
        )}

        {data.projects.slice(0, 3).map((project, index) => {
          const mainLink = project.links && project.links.length > 0 ? project.links[0] : null;
          const hasLink = !!mainLink;
          const Tag = hasLink ? "a" : "div";

          return (
            <Tag
              key={index}
              href={hasLink ? mainLink.url : undefined}
              target={hasLink ? "_blank" : undefined}
              rel={hasLink ? "noreferrer" : undefined}
              className={`${styles.cardLinkButton} ${hasLink ? styles.clickable : ""}`}
            >
              {project.title} {hasLink && "↗"}
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
