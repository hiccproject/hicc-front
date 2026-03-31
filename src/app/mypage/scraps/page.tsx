"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { apiFetch } from "@/lib/api/client";
import { getPublicPortfolioDetail } from "@/lib/api/cards";
import styles from "../../explore/explore.module.css";

const DEFAULT_PROFILE_IMG = "/default-avatar.png";
const PAGE_SIZE = 12;

type PortfolioListItem = {
  slug: string | null;
  username?: string | null;
  profileImg: string | null;
  categoryTitle: string | null;
  subCategory: string | null;
  summaryIntro?: string | null;
  intro?: string | null;
  tags?: string[] | null;
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

type ScrapListRawResponse =
  | PortfolioListResponse
  | { data?: PortfolioListResponse | PortfolioListItem[] }
  | PortfolioListItem[];

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

function normalizeListResponse(raw: ScrapListRawResponse): PortfolioListResponse {
  const payload = (
    (raw as { data?: PortfolioListResponse | PortfolioListItem[] })?.data ?? raw
  ) as PortfolioListResponse | PortfolioListItem[];

  if (Array.isArray(payload)) {
    return {
      content: payload,
      hasNext: false,
      page: 0,
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
    page: typeof payload.page === "number" ? payload.page : 0,
    size: typeof payload.size === "number" ? payload.size : PAGE_SIZE,
    totalElements:
      typeof payload.totalElements === "number"
        ? payload.totalElements
        : content.length,
    totalPages: typeof payload.totalPages === "number" ? payload.totalPages : undefined,
    last: typeof payload.last === "boolean" ? payload.last : !hasNext,
  };
}

export default function MyScrapListPage() {
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
        params.set("page", String(pageNumber));
        params.set("size", String(PAGE_SIZE));

        const raw = await apiFetch<ScrapListRawResponse>(
          `/api/portfolios/scraps?${params.toString()}`,
          {
            method: "GET",
            auth: true,
          }
        );

        const data = normalizeListResponse(raw);
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
        setTotalPages(
          typeof data?.totalPages === "number" && data.totalPages > 0
            ? data.totalPages
            : null
        );
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "목록을 불러올 수 없습니다.");
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [selectedCategories, selectedTags]
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
    if (totalPages <= 1)
      return {
        pages: [0],
        showFirst: false,
        showLast: false,
        leftEllipsis: false,
        rightEllipsis: false,
      };

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
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1>스크랩 목록</h1>
          </div>
        </section>

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

        </section>

        <section className={styles.activeFilters}>
          {activeCategoryLabels.map((label) => (
            <span key={label} className={styles.activeChip}>
              {label}
            </span>
          ))}
          {selectedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.tagChip}
              onClick={() => removeTag(tag)}
            >
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
            const tags = Array.isArray(item.tags) ? item.tags : [];
            const updatedDate = formatUpdatedDate(item.updatedAt);
            const link = item.slug ? `/portfolio?slug=${encodeURIComponent(item.slug)}` : null;
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
                  {tags.length > 0 ? (
                    tags.map((tag) => (
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
                <Link href={link} className={styles.cardLink}>
                  {cardArticle}
                </Link>
              </div>
            ) : (
              <div key={`empty-${index}`} className={`${styles.cardLink} ${styles.cardShell}`}>
                {cardArticle}
              </div>
            );
          })}
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}
        {loading ? <p className={styles.loading}>불러오는 중...</p> : null}
        {!loading && items.length === 0 && !error ? (
          <p className={styles.empty}>스크랩한 명함이 없습니다.</p>
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
