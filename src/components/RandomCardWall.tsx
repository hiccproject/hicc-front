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
                  // 경로 형식은 프로젝트 구조에 따라 /portfolio/[id] 등으로 설정 가능합니다.
                  router.push(`/portfolio/${card.id}`); 
                }
              }}
            >
              <div className={styles.avatarCircle} />
              <div className={styles.cardHeader}>
                <h4 className={styles.name}>{card.name}</h4>
                <span className={styles.role}>{card.role}</span>
              </div>
              <p className={styles.intro}>{card.intro}</p>
              
              <div className={styles.dummyTags}>
                <span>UX/UI</span><span>AI</span><span>Motion</span>
              </div>
              <div className={styles.dummyLinks}>
                <div className={styles.linkLine} />
                <div className={styles.linkLine} />
              </div>
            </div>
          );
        })}
      </div>

      <button className={styles.arrowBtn} onClick={() => setCurrentIndex(rightIdx)}>›</button>
    </div>
  );
}