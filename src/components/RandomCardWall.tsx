"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./RandomCardWall.module.css";
import type { Card } from "@/types/card";
import { getHomeCards } from "@/lib/api/cards";

type PositionedCard = Card & {
  x: number;   // %
  y: number;   // %
  rot: number; // deg
  z: number;   // z-index
};

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

const SHOW_COUNT = 6;

export default function RandomCardWall() {
  const [myCard, setMyCard] = useState<Card | null>(null);
  const [publicCards, setPublicCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getHomeCards(SHOW_COUNT);
        setMyCard(res.myCard);
        setPublicCards(res.cards);
      } catch {
        setMyCard(null);
        setPublicCards([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * ✅ 내 명함 우선 노출 + 나머지 랜덤 채우기
   */
  const cardsToShow = useMemo(() => {
    const picked: Card[] = [];

    if (myCard) picked.push(myCard);

    const pool = shuffle(publicCards);

    for (const c of pool) {
      if (picked.length >= SHOW_COUNT) break;
      if (picked.some((p) => p.id === c.id)) continue;
      picked.push(c);
    }

    return picked.slice(0, SHOW_COUNT);
  }, [myCard, publicCards]);

  /**
   * ✅ 카드 배치(겹침 최소화용 “약한 그리드 + 랜덤 오프셋”)
   * - 렌더링마다 위치가 튀지 않게 useMemo
   */
  const positioned = useMemo<PositionedCard[]>(() => {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    // 3x2 배치 기반 + 랜덤
    return cardsToShow.map((c, idx) => {
      const col = idx % 3;        // 0,1,2
      const row = Math.floor(idx / 3); // 0,1

      const baseX = col * 30; // 0, 30, 60 (대략)
      const baseY = row * 38; // 0, 38

      const x = clamp(baseX + (Math.random() * 10 - 5), 6, 72);
      const y = clamp(baseY + (Math.random() * 12 - 6), 8, 72);

      const rot = Math.random() * 8 - 4; // -4 ~ +4
      const z = myCard?.id === c.id ? 10 : 1 + idx;

      return { ...c, x, y, rot, z };
    });
  }, [cardsToShow, myCard?.id]);

  return (
    <div className={styles.wall} aria-label="랜덤 명함 미리보기 영역">
      {loading ? (
        <div className={styles.skeleton}>
          <div className={styles.skeletonText}>명함을 불러오는 중…</div>
        </div>
      ) : (
        positioned.map((c) => (
          <div
            key={c.id}
            className={`${styles.card} ${myCard?.id === c.id ? styles.myCard : ""}`}
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              transform: `rotate(${c.rot}deg)`,
              zIndex: c.z,
            }}
          >
            <div className={styles.cardHeader}>
              <h4 className={styles.name}>{c.name}</h4>
              {c.role ? <span className={styles.role}>{c.role}</span> : null}
            </div>

            {c.intro ? <p className={styles.intro}>{c.intro}</p> : null}

            {myCard?.id === c.id ? <span className={styles.badge}>내 명함</span> : null}
          </div>
        ))
      )}
    </div>
  );
}
