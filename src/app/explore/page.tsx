// src/app/explore/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { buildApiUrl } from "@/lib/api/config";
import styles from "./explore.module.css";

const DEFAULT_PROFILE_IMG = "/default-avatar.png";
const PAGE_SIZE = 12;

type SortKey = "LATEST" | "OLDEST" | "POPULAR" | "REALTIME";

type PortfolioListItem = {
  slug: string | null;
  username?: string | null;
  profileImg: string | null;
  categoryTitle: string | null;
  subCategory: string | null;
  tags: string[];
  updatedAt: string;
  status?: "DRAFT" | "PUBLISHED";
  isPublic?: boolean;
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
  const [sort, setSort] = useState<SortKey>("POPULAR");

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
        setItems(nextItems);
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
            const updatedDate = formatUpdatedDate(item.updatedAt);
            const link = item.slug ? `/portfolio?slug=${encodeURIComponent(item.slug)}` : null;
            const cardBody = (
              <article
                className={`${styles.card} ${!item.slug ? styles.cardDisabled : ""}`}
                key={`${item.slug ?? "empty"}-${index}`}
              >
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
              <Link key={`${item.slug}-${index}`} href={link} className={styles.cardLink}>
                {cardBody}
              </Link>
            ) : (
              <div key={`empty-${index}`} className={styles.cardLink}>
                {cardBody}
              </div>
            );
          })}
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}
        {loading ? <p className={styles.loading}>불러오는 중...</p> : null}
        {!loading && items.length === 0 && !error ? (
          <p className={styles.empty}>조건에 맞는 포트폴리오가 없습니다.</p>
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
