"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./RandomCardWall.module.css";
import type { Card } from "@/types/card";
import { buildApiUrl } from "@/lib/api/config";

const SHOW_COUNT = 10;
const DEFAULT_PROFILE_IMG = "/default-avatar.png";

// ---------- 1) POPULAR 리스트 응답 ----------
type ExploreSort = "LATEST" | "OLDEST" | "POPULAR" | "REALTIME";

type PortfolioListItem = {
  slug: string; // 8글자
  profileImg: string | null;
  categoryTitle: string;
  subCategory: string;
  tags: string[];
  username: string;
  updatedAt: string;
};

type PortfolioListResponse = {
  content: PortfolioListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

function buildListUrl(params: { page: number; size: number; sort: ExploreSort }) {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("size", String(params.size));
  sp.set("sort", params.sort);
  return buildApiUrl(`/api/portfolios/list?${sp.toString()}`);
}

// ---------- 2) slug 상세 응답 ----------
type ApiEnvelope<T> = { code: string; message: string; data?: T };

type PortfolioDetailApi = {
  id: number;
  category: string;
  subCategory: string;
  profileImg: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  summaryIntro: string | null;
  layoutType: "CARD" | "LIST" | "GRID";
  tags?: string[] | null;
  updatedAt: string;
  totalViewCount: number | null;
  todayViewCount: number | null;
  username: string;
  owner: boolean;
};

async function fetchPopularListFirstPage(): Promise<PortfolioListItem[]> {
  const res = await fetch(buildListUrl({ page: 0, size: SHOW_COUNT, sort: "POPULAR" }), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as PortfolioListResponse | null;
  if (!res.ok || !json) return [];
  return Array.isArray(json.content) ? json.content : [];
}

async function fetchPortfolioDetailBySlug(slug: string): Promise<PortfolioDetailApi | null> {
  const res = await fetch(buildApiUrl(`/api/portfolios/${encodeURIComponent(slug)}`), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as ApiEnvelope<PortfolioDetailApi> | null;
  if (!res.ok || !json?.data) return null;
  return json.data;
}

// ---------- Card 변환 ----------
// 1) 리스트 아이템 -> "기본 카드" (빠르게 먼저 그림)
function listItemToCard(item: PortfolioListItem): Card {
  return {
    id: item.slug, // Card.id는 string이어야 했지!
    name: item.username,
    profileImage: item.profileImg ?? undefined, // null -> undefined
    category: item.categoryTitle ?? undefined,
    subCategory: item.subCategory ?? undefined,
    intro: undefined, // 상세에서 summaryIntro로 채움
    email: undefined,
    phone: undefined,
    location: undefined,
    linkHref: `/portfolio?slug=${encodeURIComponent(item.slug)}`,
    badge: undefined,
    progressMode: undefined,
  };
}

// 2) 상세 데이터 -> 기존 카드에 덮어쓰기
function mergeDetailIntoCard(base: Card, detail: PortfolioDetailApi): Card {
  return {
    ...base,
    name: detail.username || base.name,
    profileImage: detail.profileImg ?? base.profileImage,
    // category는 백엔드가 enum(DEVELOPMENT)이라면 기존 categoryTitle을 유지하는 게 더 보기 좋음
    subCategory: detail.subCategory ?? base.subCategory,
    intro: detail.summaryIntro?.trim() ? detail.summaryIntro.trim() : base.intro,
    email: detail.email ?? base.email,
    phone: detail.phone ?? base.phone,
    location: detail.location ?? base.location,
  };
}

export default function RandomCardWall() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // 상세를 중복 호출하지 않기 위한 캐시
  const [detailCache, setDetailCache] = useState<Record<string, PortfolioDetailApi>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const list = await fetchPopularListFirstPage();
        const baseCards = list.map(listItemToCard);

        // 랜덤 카드월 느낌 유지
        const shuffled = [...baseCards].sort(() => Math.random() - 0.5);

        if (!cancelled) {
          setCards(shuffled);
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

  // ✅ 현재 보이는 카드(좌/중/우)만 상세를 가져와서 “사진처럼” 채움
  useEffect(() => {
    let cancelled = false;

    const targets = [currentIndex, leftIdx, rightIdx]
      .map((idx) => cards[idx])
      .filter(Boolean);

    (async () => {
      for (const c of targets) {
        const slug = c.id; // id === slug
        if (!slug) continue;
        if (detailCache[slug]) continue;

        const detail = await fetchPortfolioDetailBySlug(slug);
        if (!detail || cancelled) continue;

        // 캐시 저장
        setDetailCache((prev) => ({ ...prev, [slug]: detail }));

        // 카드 업데이트(기존 UI 그대로, 데이터만 채움)
        setCards((prev) =>
          prev.map((card) => (card.id === slug ? mergeDetailIntoCard(card, detail) : card))
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cards, currentIndex, leftIdx, rightIdx, detailCache]);

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
                } else if (index === currentIndex) {
                  const target = card.linkHref || `/portfolio?slug=${encodeURIComponent(card.id)}`;
                  router.push(target);
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
