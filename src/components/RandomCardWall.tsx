"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./RandomCardWall.module.css";
import type { Card } from "@/types/card";
import { getHomeCards } from "@/lib/api/cards";

const SHOW_COUNT = 10;
const DEFAULT_PROFILE_IMG = "/default-avatar.png";

export default function RandomCardWall() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const { myCard, cards: randomCards } = await getHomeCards(SHOW_COUNT);
        const combined = myCard ? [myCard, ...randomCards] : randomCards;

        if (!cancelled) {
          setCards(combined);
          setCurrentIndex(0);
        }
      } catch {
        if (!cancelled) setCards([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const getIndex = (offset: number) => {
    if (cards.length === 0) return 0;
    return (currentIndex + offset + cards.length) % cards.length;
  };

  const leftIdx = useMemo(() => getIndex(-1), [currentIndex, cards.length]);
  const rightIdx = useMemo(() => getIndex(1), [currentIndex, cards.length]);

  if (loading) return <div className={styles.skeleton}>명함을 불러오는 중…</div>;
  if (cards.length === 0) return null;

  return (
    <div className={styles.carouselContainer}>
      <button className={styles.arrowBtn} onClick={() => setCurrentIndex(leftIdx)}>
        ‹
      </button>

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
                  setCurrentIndex(index);
                  return;
                }
                if (index !== currentIndex) return;
                if (card.linkHref) {
                  router.push(card.linkHref);
                }
              }}
            >
              {card.badge ? <span className={styles.statusBadge}>{card.badge}</span> : null}

              <div className={styles.avatarCircle}>
                <img
                  src={card.profileImage || DEFAULT_PROFILE_IMG}
                  alt={`${card.name} 프로필`}
                  onError={(event) => {
                    (event.currentTarget as HTMLImageElement).src = DEFAULT_PROFILE_IMG;
                  }}
                />
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

      <button className={styles.arrowBtn} onClick={() => setCurrentIndex(rightIdx)}>
        ›
      </button>
    </div>
  );
}
