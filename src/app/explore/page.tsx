// src/app/explore/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { buildApiUrl } from "@/lib/api/config";
import {
  getLikedPortfolios,
  getPublicPortfolioDetail,
  getScrappedPortfolios,
  togglePortfolioLike,
  togglePortfolioScrap,
  type PortfolioReactionListItem as ReactionListItem,
  type PortfolioReactionListRawResponse as ReactionListRawResponse,
  type PortfolioReactionListResponse as ReactionListResponse,
} from "@/lib/api/cards";
import { getAccessToken } from "@/lib/auth/tokens";
import styles from "./explore.module.css";

const DEFAULT_PROFILE_IMG = "/default-avatar.png";
const PAGE_SIZE = 12;
const REACTION_PAGE_SIZE = 100;
const REACTION_MAX_PAGES = 20;

type SortKey = "LATEST" | "OLDEST" | "POPULAR" | "REALTIME";

type PortfolioListItem = {
  slug: string | null;
  username?: string | null;
  profileImg: string | null;
  categoryTitle: string | null;
  subCategory: string | null;
  summaryIntro?: string | null;
  intro?: string | null;
  tags: string[];
  updatedAt: string;
  status?: "DRAFT" | "PUBLISHED";
  isPublic?: boolean;
  likeCount?: number;
  scrapCount?: number;
  liked?: boolean;
  scraped?: boolean;
};

type PortfolioListResponse = {
  content: PortfolioListItem[];
  hasNext: boolean;
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  last?: boolean;
};

type CategoryOption = {
  value: string;
  label: string;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: "DEVELOPMENT", label: "IT·개발" },
  { value: "DESIGN", label: "디자인" },
  { value: "MARKETING", label: "마케팅·광고" },
  { value: "PLANNING", label: "기획·전략" },
  { value: "BUSINESS", label: "영업·고객상담" },
  { value: "MANAGEMENT", label: "경영·인사·총무" },
  { value: "FINANCE", label: "금융·재무" },
  { value: "SERVICE", label: "서비스·교육" },
  { value: "ENGINEERING", label: "엔지니어링·설계" },
  { value: "MEDIA", label: "미디어" },
  { value: "MEDICAL", label: "의료" },
  { value: "OTHERS", label: "기타" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "POPULAR", label: "인기순(전체 조회)" },
  { value: "REALTIME", label: "인기순(일일 조회)" },
  { value: "LATEST", label: "최신순" },
  { value: "OLDEST", label: "등록순" },
];

const INACTIVE_ICON_COLOR = "#B5BDCA";
const ACTIVE_ICON_COLOR = "#4B71EF";

function formatUpdatedDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function isPublicListItem(item: PortfolioListItem) {
  if (item.status && item.status !== "PUBLISHED") return false;
  if (item.isPublic === false) return false;
  if (!item.slug) return false;
  return true;
}

function truncateIntro(value: string, maxLength = 40) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
}

function normalizeReactionListResponse(raw: ReactionListRawResponse): ReactionListResponse {
  const payload = (
    (raw as { data?: ReactionListResponse | ReactionListItem[] })?.data ?? raw
  ) as ReactionListResponse | ReactionListItem[];

  if (Array.isArray(payload)) {
    return {
      content: payload,
      hasNext: false,
      page: 1,
      size: payload.length,
      totalElements: payload.length,
      totalPages: payload.length > 0 ? 1 : 0,
      last: true,
    };
  }

  const content = Array.isArray(payload.content) ? payload.content : [];
  const hasNext =
    typeof payload.hasNext === "boolean"
      ? payload.hasNext
      : typeof payload.last === "boolean"
        ? !payload.last
        : false;

  return {
    content,
    hasNext,
    page: typeof payload.page === "number" ? payload.page : 1,
    size: typeof payload.size === "number" ? payload.size : REACTION_PAGE_SIZE,
    totalElements: typeof payload.totalElements === "number" ? payload.totalElements : content.length,
    totalPages: typeof payload.totalPages === "number" ? payload.totalPages : undefined,
    last: typeof payload.last === "boolean" ? payload.last : !hasNext,
  };
}

function extractApiMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  const raw = error.message || "";
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    const maybeJson = raw.slice(jsonStart);
    try {
      const parsed = JSON.parse(maybeJson) as { message?: string };
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      // no-op
    }
  }

  return raw || fallback;
}

function HeartIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.actionIcon}>
      <path
        d="M12 20.5 4.95 13.8a4.96 4.96 0 0 1 0-7.11 4.9 4.9 0 0 1 6.96 0L12 7l.09-.31a4.9 4.9 0 0 1 6.96 0 4.96 4.96 0 0 1 0 7.11L12 20.5Z"
        fill={active ? color : "none"}
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookmarkIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.actionIcon}>
      <path
        d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v13.07a.2.2 0 0 1-.32.16L12 14.82l-5.93 4.41a.2.2 0 0 1-.32-.16V6A1.25 1.25 0 0 1 7 4.75Z"
        fill={active ? color : "none"}
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ExplorePage() {
  const [items, setItems] = useState<PortfolioListItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [sort, setSort] = useState<SortKey>("REALTIME");
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [scrappedItems, setScrappedItems] = useState<Record<string, boolean>>({});
  const [pendingReactions, setPendingReactions] = useState<Record<string, boolean>>({});

  const activeCategoryLabels = useMemo(() => {
    return CATEGORY_OPTIONS.filter((option) => selectedCategories.includes(option.value)).map(
      (option) => option.label
    );
  }, [selectedCategories]);

  const fetchPage = useCallback(
    async (pageNumber: number) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        selectedCategories.forEach((category) => params.append("category", category));
        selectedTags.forEach((tag) => params.append("tag", tag));
        params.set("sort", sort);
        params.set("page", String(pageNumber));
        params.set("size", String(PAGE_SIZE));

        const res = await fetch(buildApiUrl(`/api/portfolios/list?${params.toString()}`), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (!res.ok) {
          const message = `불러오기에 실패했습니다. (${res.status})`;
          throw new Error(message);
        }

        const data = (await res.json()) as PortfolioListResponse;
        const nextItems = (data?.content ?? []).filter(isPublicListItem);

        const withIntro = await Promise.all(
          nextItems.map(async (item) => {
            if (!item.slug) return item;
            try {
              const detail = await getPublicPortfolioDetail(item.slug);
              const summaryIntro = detail?.data?.summaryIntro?.trim() || "";
              return { ...item, summaryIntro };
            } catch {
              return item;
            }
          })
        );

        setItems(withIntro);
        setHasNext(Boolean(data?.hasNext));
        setTotalPages(typeof data?.totalPages === "number" ? data.totalPages : null);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "목록을 불러올 수 없습니다.");
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [selectedCategories, selectedTags, sort]
  );

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  const fetchReactionSlugSet = useCallback(
    async (reactionType: "likes" | "scraps", targetSlugs: Set<string>) => {
      if (targetSlugs.size === 0) return new Set<string>();

      const fetchByStartPage = async (startPage: number) => {
        const unresolved = new Set(targetSlugs);
        const matched = new Set<string>();
        let pageNumber = startPage;
        let pageCount = 0;

        while (pageCount < REACTION_MAX_PAGES && unresolved.size > 0) {
          const params = new URLSearchParams();
          params.set("page", String(pageNumber));
          params.set("size", String(REACTION_PAGE_SIZE));

          const raw =
            reactionType === "likes"
              ? await getLikedPortfolios(params)
              : await getScrappedPortfolios(params);
          const normalized = normalizeReactionListResponse(raw);

          normalized.content.forEach((item) => {
            const slug = item.slug?.trim();
            if (!slug || !unresolved.has(slug)) return;
            unresolved.delete(slug);
            matched.add(slug);
          });

          const isLastPage =
            typeof normalized.last === "boolean"
              ? normalized.last
              : typeof normalized.hasNext === "boolean"
                ? !normalized.hasNext
                : false;

          if (isLastPage) break;

          pageNumber += 1;
          pageCount += 1;
        }

        return matched;
      };

      const [zeroBasedResult, oneBasedResult] = await Promise.allSettled([
        fetchByStartPage(0),
        fetchByStartPage(1),
      ]);

      const merged = new Set<string>();

      if (zeroBasedResult.status === "fulfilled") {
        zeroBasedResult.value.forEach((slug) => merged.add(slug));
      }
      if (oneBasedResult.status === "fulfilled") {
        oneBasedResult.value.forEach((slug) => merged.add(slug));
      }

      if (zeroBasedResult.status === "rejected" && oneBasedResult.status === "rejected") {
        throw zeroBasedResult.reason ?? oneBasedResult.reason;
      }

      return merged;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    const syncReactionStates = async () => {
      if (!getAccessToken()) {
        if (!cancelled) {
          setLikedItems({});
          setScrappedItems({});
        }
        return;
      }

      const visibleSlugSet = new Set(
        items.map((item) => item.slug?.trim() ?? "").filter((slug) => slug.length > 0)
      );

      if (visibleSlugSet.size === 0) {
        if (!cancelled) {
          setLikedItems({});
          setScrappedItems({});
        }
        return;
      }

      const [likedResult, scrappedResult] = await Promise.allSettled([
        fetchReactionSlugSet("likes", visibleSlugSet),
        fetchReactionSlugSet("scraps", visibleSlugSet),
      ]);

      if (cancelled) return;

      if (likedResult.status === "rejected") {
        console.warn("Failed to sync like states:", likedResult.reason);
      }
      if (scrappedResult.status === "rejected") {
        console.warn("Failed to sync scrap states:", scrappedResult.reason);
      }

      const likedSlugSet =
        likedResult.status === "fulfilled" ? likedResult.value : new Set<string>();
      const scrappedSlugSet =
        scrappedResult.status === "fulfilled" ? scrappedResult.value : new Set<string>();

      const nextLiked: Record<string, boolean> = {};
      const nextScrapped: Record<string, boolean> = {};

      items.forEach((item, index) => {
        const key = item.slug ?? `empty-${index}`;
        const normalizedSlug = item.slug?.trim();

        if (!normalizedSlug) {
          nextLiked[key] = false;
          nextScrapped[key] = false;
          return;
        }

        nextLiked[key] = likedSlugSet.has(normalizedSlug);
        nextScrapped[key] = scrappedSlugSet.has(normalizedSlug);
      });

      setLikedItems(nextLiked);
      setScrappedItems(nextScrapped);
    };

    syncReactionStates();

    return () => {
      cancelled = true;
    };
  }, [items, fetchReactionSlugSet]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
    setPage(0);
    setHasNext(true);
    setTotalPages(null);
    setItems([]);
  };

  const handleTagSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = tagInput.trim();
    if (!normalized) return;
    if (selectedTags.includes(normalized)) {
      setTagInput("");
      return;
    }
    setSelectedTags((prev) => [...prev, normalized]);
    setTagInput("");
    setPage(0);
    setHasNext(true);
    setTotalPages(null);
    setItems([]);
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((item) => item !== tag));
    setPage(0);
    setHasNext(true);
    setTotalPages(null);
    setItems([]);
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 0) return;
    if (totalPages !== null && nextPage >= totalPages) return;
    setPage(nextPage);
  };

  const pagination = useMemo(() => {
    if (totalPages === null) return null;
    if (totalPages <= 1) return { pages: [0], showFirst: false, showLast: false, leftEllipsis: false, rightEllipsis: false };

    const groupSize = 5;
    const half = Math.floor(groupSize / 2);
    let start = Math.max(0, page - half);
    let end = Math.min(totalPages - 1, start + groupSize - 1);
    start = Math.max(0, end - groupSize + 1);

    const pages = [];
    for (let p = start; p <= end; p += 1) pages.push(p);

    return {
      pages,
      showFirst: start > 0,
      showLast: end < totalPages - 1,
      leftEllipsis: start > 1,
      rightEllipsis: end < totalPages - 2,
    };
  }, [page, totalPages]);

  const handleToggleLike = async (
    event: React.MouseEvent<HTMLButtonElement>,
    slug: string | null,
    key: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!slug || pendingReactions[key]) return;

    setPendingReactions((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await togglePortfolioLike(slug);
      const reaction = response?.data;
      if (typeof reaction?.liked === "boolean") {
        setLikedItems((prev) => ({ ...prev, [key]: reaction.liked }));
      } else {
        setLikedItems((prev) => ({ ...prev, [key]: !prev[key] }));
      }

      if (typeof reaction?.scraped === "boolean") {
        setScrappedItems((prev) => ({ ...prev, [key]: reaction.scraped }));
      }
    } catch (reactionError) {
      alert(extractApiMessage(reactionError, "좋아요 처리에 실패했습니다."));
    } finally {
      setPendingReactions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleToggleScrap = async (
    event: React.MouseEvent<HTMLButtonElement>,
    slug: string | null,
    key: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!slug || pendingReactions[key]) return;

    setPendingReactions((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await togglePortfolioScrap(slug);
      const reaction = response?.data;
      if (typeof reaction?.scraped === "boolean") {
        setScrappedItems((prev) => ({ ...prev, [key]: reaction.scraped }));
      } else {
        setScrappedItems((prev) => ({ ...prev, [key]: !prev[key] }));
      }

      if (typeof reaction?.liked === "boolean") {
        setLikedItems((prev) => ({ ...prev, [key]: reaction.liked }));
      }
    } catch (reactionError) {
      alert(extractApiMessage(reactionError, "스크랩 처리에 실패했습니다."));
    } finally {
      setPendingReactions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerWrap}>
        <Header />
      </div>
      <main className={styles.container}>
        <section className={styles.hero} />

        <section className={styles.filters}>
          <form className={styles.searchBar} onSubmit={handleTagSubmit}>
            <span className={styles.searchIcon} />
            <input
              type="text"
              placeholder="태그 검색"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
            />
            <button type="submit">추가</button>
          </form>

          <div className={styles.sortBox}>
            <label htmlFor="sort" className={styles.sortLabel}>
              정렬
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortKey);
                setPage(0);
                setHasNext(true);
                setTotalPages(null);
                setItems([]);
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className={styles.activeFilters}>
          {activeCategoryLabels.map((label) => (
            <span key={label} className={styles.activeChip}>
              {label}
            </span>
          ))}
          {selectedTags.map((tag) => (
            <button key={tag} type="button" className={styles.tagChip} onClick={() => removeTag(tag)}>
              {tag}
              <span aria-hidden>×</span>
            </button>
          ))}
        </section>

        <section className={styles.categoryRow}>
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={selectedCategories.includes(option.value) ? styles.categoryActive : styles.categoryChip}
              onClick={() => toggleCategory(option.value)}
            >
              {option.label}
            </button>
          ))}
        </section>

        <section className={styles.grid}>
          {items.map((item, index) => {
            const title = item.username?.trim() || item.categoryTitle || "미입력";
            const role = item.subCategory ?? "직무 미입력";
            const intro = truncateIntro(item.summaryIntro ?? item.intro ?? "");
            const updatedDate = formatUpdatedDate(item.updatedAt);
            const link = item.slug ? `/portfolio?slug=${encodeURIComponent(item.slug)}` : null;
            const actionKey = item.slug ?? `empty-${index}`;
            const isLiked = Boolean(likedItems[actionKey]);
            const isScrapped = Boolean(scrappedItems[actionKey]);
            const isReactionPending = Boolean(pendingReactions[actionKey]);
            const cardActions = (
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={`${styles.actionButton} ${isLiked ? styles.actionButtonActive : ""}`}
                  aria-label={isLiked ? "좋아요 취소" : "좋아요"}
                  aria-pressed={isLiked}
                  disabled={isReactionPending || !item.slug}
                  onClick={(event) => handleToggleLike(event, item.slug, actionKey)}
                >
                  <HeartIcon active={isLiked} />
                </button>
                <button
                  type="button"
                  className={`${styles.actionButton} ${isScrapped ? styles.actionButtonActive : ""}`}
                  aria-label={isScrapped ? "스크랩 취소" : "스크랩"}
                  aria-pressed={isScrapped}
                  disabled={isReactionPending || !item.slug}
                  onClick={(event) => handleToggleScrap(event, item.slug, actionKey)}
                >
                  <BookmarkIcon active={isScrapped} />
                </button>
              </div>
            );
            const cardArticle = (
              <article className={`${styles.card} ${!item.slug ? styles.cardDisabled : ""}`}>
                <div className={styles.avatar}>
                  <img
                    src={item.profileImg || DEFAULT_PROFILE_IMG}
                    alt="프로필 이미지"
                    onError={(event) => {
                      (event.currentTarget as HTMLImageElement).src = DEFAULT_PROFILE_IMG;
                    }}
                  />
                </div>
                <h3>{title}</h3>
                <p>{role}</p>
                {intro ? <p className={styles.cardIntro}>{intro}</p> : null}
                <div className={styles.tagList}>
                  {item.tags && item.tags.length > 0 ? (
                    item.tags.map((tag) => (
                      <span key={tag} className={styles.tagBadge}>
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className={styles.tagBadgeMuted}>#태그없음</span>
                  )}
                </div>
                {updatedDate ? <span className={styles.updated}>업데이트 {updatedDate}</span> : null}
              </article>
            );

            return link ? (
              <div key={`${item.slug}-${index}`} className={styles.cardShell}>
                {cardActions}
                <Link href={link} className={styles.cardLink}>
                  {cardArticle}
                </Link>
              </div>
            ) : (
              <div key={`empty-${index}`} className={`${styles.cardLink} ${styles.cardShell}`}>
                {cardActions}
                {cardArticle}
              </div>
            );
          })}
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}
        {loading ? <p className={styles.loading}>불러오는 중...</p> : null}
        {!loading && items.length === 0 && !error ? (
          <p className={styles.empty}>조건에 맞는 명함이 없습니다.</p>
        ) : null}

        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageNav}
            onClick={() => goToPage(page - 1)}
            disabled={page === 0 || loading}
          >
            ← 이전
          </button>

          {pagination ? (
            <div className={styles.pageNumbers}>
              {pagination.showFirst ? (
                <button
                  type="button"
                  className={page === 0 ? styles.pageActive : styles.pageButton}
                  onClick={() => goToPage(0)}
                  disabled={loading}
                >
                  1
                </button>
              ) : null}
              {pagination.leftEllipsis ? <span className={styles.pageEllipsis}>…</span> : null}
              {pagination.pages.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={page === p ? styles.pageActive : styles.pageButton}
                  onClick={() => goToPage(p)}
                  disabled={loading}
                >
                  {p + 1}
                </button>
              ))}
              {pagination.rightEllipsis ? <span className={styles.pageEllipsis}>…</span> : null}
              {pagination.showLast ? (
                <button
                  type="button"
                  className={page === (totalPages ?? 1) - 1 ? styles.pageActive : styles.pageButton}
                  onClick={() => goToPage((totalPages ?? 1) - 1)}
                  disabled={loading}
                >
                  {totalPages}
                </button>
              ) : null}
            </div>
          ) : (
            <div className={styles.pageNumbers}>
              <span className={styles.pageEllipsis}>Page {page + 1}</span>
            </div>
          )}

          <button
            type="button"
            className={styles.pageNav}
            onClick={() => goToPage(page + 1)}
            disabled={loading || (totalPages !== null ? page >= totalPages - 1 : !hasNext)}
          >
            다음 →
          </button>
        </div>
      </main>
    </div>
  );
}
