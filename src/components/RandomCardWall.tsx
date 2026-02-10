"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // 내비게이션을 위해 추가
import styles from "./RandomCardWall.module.css";
import type { Card } from "@/types/card";
import { getHomeCards } from "@/lib/api/cards";

const SHOW_COUNT = 10;

export default function RandomCardWall() {
  const router = useRouter(); // router 인스턴스 생성
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getHomeCards(SHOW_COUNT);
        const shuffled = [...res.cards].sort(() => Math.random() - 0.5);
        const finalCards = res.myCard ? [res.myCard, ...shuffled] : shuffled;
        setCards(finalCards);
      } catch {
        setCards([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getIndex = (offset: number) => {
    if (cards.length === 0) return 0;
    return (currentIndex + offset + cards.length) % cards.length;
  };

  if (loading) return <div className={styles.skeleton}>명함을 불러오는 중…</div>;
  if (cards.length === 0) return null;

  const leftIdx = getIndex(-1);
  const rightIdx = getIndex(1);

  return (
    <div className={styles.carouselContainer}>
      <button className={styles.arrowBtn} onClick={() => setCurrentIndex(leftIdx)}>‹</button>

      <div className={styles.viewport}>
        {cards.map((card, index) => {
          let positionClass = styles.hiddenCard;
          let isSide = false;

          if (index === currentIndex) {
            positionClass = styles.mainCard;
          } else if (index === leftIdx) {
            positionClass = styles.leftCard;
            isSide = true;
          } else if (index === rightIdx) {
            positionClass = styles.rightCard;
            isSide = true;
          }

          return (
            <div
              key={card.id}
              className={`${styles.card} ${positionClass} ${isSide ? styles.sideCard : ""}`}
              onClick={() => {
                if (isSide) {
                  // 사이드 카드 클릭 시 해당 카드를 중앙으로 이동
                  setCurrentIndex(index);
                } else if (index === currentIndex) {
                  // 중앙 카드 클릭 시 해당 지원자의 포트폴리오 페이지로 이동
                  const target = card.linkHref || `/portfolio/${card.id}`;
                  if (target) {
                    router.push(target);
                  }
                }
              }}
            >
              {card.badge ? <span className={styles.statusBadge}>{card.badge}</span> : null}
              <div className={styles.avatarCircle}>
                {card.profileImage ? (
                  <img src={card.profileImage} alt={`${card.name} 프로필`} />
                ) : null}
              </div>
              <div className={styles.cardHeader}>
                <h4 className={styles.name}>{card.name}</h4>
                {!card.progressMode || card.progressMode === "single" ? (
                  card.category || card.subCategory ? (
                    <span className={styles.categoryBadge}>
                      {[card.category, card.subCategory].filter(Boolean).join(" / ")}
                    </span>
                  ) : null
                ) : null}
              </div>
              {card.intro ? <p className={styles.intro}>{card.intro}</p> : null}
              
              {!card.progressMode ? (
                <div className={styles.contactList}>
                  {card.email ? (
                    <div className={styles.contactChip}>
                      <span className={styles.iconMail} aria-hidden />
                      <span>{card.email}</span>
                    </div>
                  ) : null}
                  {card.phone ? (
                    <div className={styles.contactChip}>
                      <span className={styles.iconPhone} aria-hidden />
                      <span>{card.phone}</span>
                    </div>
                  ) : null}
                  {card.location ? (
                    <div className={styles.contactChip}>
                      <span className={styles.iconLocation} aria-hidden />
                      <span>{card.location}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <button className={styles.arrowBtn} onClick={() => setCurrentIndex(rightIdx)}>›</button>
    </div>
  );
}
