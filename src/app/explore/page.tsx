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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(["DEVELOPMENT"]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [sort, setSort] = useState<SortKey>("POPULAR");

  const loaderRef = useRef<HTMLDivElement | null>(null);

  const activeCategoryLabels = useMemo(() => {
    return CATEGORY_OPTIONS.filter((option) => selectedCategories.includes(option.value)).map(
      (option) => option.label
    );
  }, [selectedCategories]);

  const fetchPage = useCallback(
    async (pageNumber: number, replace = false) => {
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
        setItems((prev) => (replace ? nextItems : [...prev, ...nextItems]));
        setHasNext(Boolean(data?.hasNext));
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
    setItems([]);
    setPage(0);
    setHasNext(true);
    fetchPage(0, true);
  }, [fetchPage]);

  useEffect(() => {
    if (page === 0) return;
    fetchPage(page);
  }, [page, fetchPage]);

  useEffect(() => {
    if (!loaderRef.current || !hasNext) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasNext, loading]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
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
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((item) => item !== tag));
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
              onChange={(event) => setSort(event.target.value as SortKey)}
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
            const title = item.categoryTitle ?? "미입력";
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

        <div ref={loaderRef} className={styles.loader} />
      </main>
    </div>
  );
}
