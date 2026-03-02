// src/components/RandomCardWall.tsx (또는 동일 경로 파일)
//
// 목적
// - 홈 화면 우측에 "랜덤 명함 캐러셀"을 보여주는 컴포넌트
// - getHomeCards로 데이터를 가져와 (내 명함 0~1개 + 공개 명함들) 을 합친 뒤
//   현재 선택된 카드(currentIndex)를 중심으로 좌/우 카드까지 3장만 보이게 배치
// - 좌/우 카드를 클릭하면 해당 카드로 포커스를 이동시키고,
//   메인(중앙) 카드를 클릭하면 상세 페이지로 이동(router.push)
//
// 구현에서 중요한 포인트 / 주의점
// 1) "use client"
//    - useEffect, useState, router.push, 이미지 onError 등 클라이언트 기능 사용
// 2) cancelled 플래그
//    - 비동기 요청 중 컴포넌트가 unmount되면 setState 호출 경고가 날 수 있어 방지용
// 3) SHOW_COUNT
//    - getHomeCards(limit)의 limit은 "총 카드 수"가 아니라
//      "홈에서 보여줄 최대 카드 수"처럼 사용됨(내 카드가 있으면 공개 카드는 limit-1)
// 4) 클릭 동작
//    - 좌/우(사이드) 카드 클릭: 이동만(포커스 변경)
//    - 메인 카드 클릭: linkHref가 있으면 라우팅
// 5) 이미지 fallback
//    - profileImage 로드 실패 시 기본 이미지로 대체
//
// 구현 검토/이상할 수 있는 지점(중요)
// A) key={card.id}가 항상 유니크인지 확인 필요
//    - 공개 카드 id를 "public-<slug>"로 만들고 있어 대체로 안전하지만,
//      내 카드 id는 숫자 문자열로 만들고 있어서
//      만약 slug가 숫자처럼 겹치는 등의 규칙 충돌이 생기지 않도록 id 규칙 통일이 좋음
// B) cards 길이가 1일 때 leftIdx/rightIdx가 모두 0이 된다.
//    - 현재 로직은 동작은 하겠지만 좌/우 버튼을 눌러도 변화가 없어 UX상 어색할 수 있음
//    - cards.length <= 1이면 화살표 버튼을 숨기거나 disabled 처리하는 개선 여지가 있음
// C) getHomeCards 내부에서 공개 카드 상세 조회가 auth:true인 경로를 타면
//    - 비로그인 홈에서 randomCards가 비어버려 cards.length가 0 → 컴포넌트가 null 반환될 수 있음
//    - 즉, 랜덤 월이 가끔 아예 안 보이는 현상이 생길 수 있음(호출부 문제가 아니라 데이터 계층 문제)

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

  // cards: 캐러셀에 사용할 카드 목록(내 카드 포함 가능)
  const [cards, setCards] = useState<Card[]>([]);

  // currentIndex: 현재 중앙에 표시되는 카드 인덱스
  const [currentIndex, setCurrentIndex] = useState(0);

  // loading: 초기 로딩 상태
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // cancelled: 언마운트 이후 setState 방지 플래그
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        // 홈 카드 조회
        // - myCard: 내 카드(있을 수도/없을 수도)
        // - cards: 공개 랜덤 카드 목록
        const { myCard, cards: randomCards } = await getHomeCards(SHOW_COUNT);

        // 내 카드가 있으면 배열 맨 앞에 넣어 "내 카드"가 항상 눈에 띄도록 하는 전략
        const combined = myCard ? [myCard, ...randomCards] : randomCards;

        if (!cancelled) {
          setCards(combined);
          setCurrentIndex(0); // 데이터 갱신 시 중앙 카드를 첫 카드로 리셋
        }
      } catch {
        // 실패 시 빈 배열로 처리(홈 전체를 깨지 않기 위함)
        if (!cancelled) setCards([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // cleanup: 언마운트 시 cancelled 플래그
    return () => {
      cancelled = true;
    };
  }, []);

  // getIndex
  // - currentIndex 기준으로 offset(-1, +1 등)을 적용한 인덱스를 "원형"으로 계산
  // - 카드가 0개면 0 반환
  const getIndex = (offset: number) => {
    if (cards.length === 0) return 0;
    return (currentIndex + offset + cards.length) % cards.length;
  };

  // leftIdx/rightIdx
  // - currentIndex가 바뀔 때만 재계산하도록 useMemo 사용
  // - cards.length만 의존성에 넣은 이유: cards 자체가 바뀌면 길이도 바뀌므로 최소 의존성
  const leftIdx = useMemo(() => getIndex(-1), [currentIndex, cards.length]);
  const rightIdx = useMemo(() => getIndex(1), [currentIndex, cards.length]);

  // 로딩 중에는 스켈레톤 표시
  if (loading) return <div className={styles.skeleton}>명함을 불러오는 중…</div>;

  // 카드가 없으면 랜덤 월 자체를 숨김(홈 레이아웃을 깨지 않기 위한 정책)
  if (cards.length === 0) return null;

  return (
    <div className={styles.carouselContainer}>
      {/* 왼쪽 화살표: 좌측 카드로 이동 */}
      <button
        className={`${styles.arrowBtn} ${styles.arrowLeft}`}
        onClick={() => setCurrentIndex(leftIdx)}
        aria-label="이전 명함"
      >
        ‹
      </button>

      <div className={styles.viewport}>
        {cards.map((card, index) => {
          // positionClass: 카드의 위치에 따라 CSS로 배치/애니메이션 적용
          // - mainCard: 중앙
          // - leftCard/rightCard: 좌/우
          // - hiddenCard: 그 외는 숨김
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
              key={card.id} // 카드 식별자: 유니크 보장 여부는 데이터 레이어에서 보장되어야 함
              className={`${styles.card} ${positionClass} ${
                isSide ? styles.sideCard : ""
              }`}
              onClick={() => {
                // 사이드 카드는 클릭하면 중앙으로 가져오기만 한다(이동 X)
                if (isSide) {
                  setCurrentIndex(index);
                  return;
                }

                // 안전장치: 중앙이 아닌데도 여기 들어오면 무시
                if (index !== currentIndex) return;

                // 중앙 카드에서 linkHref가 있으면 상세로 이동
                // linkHref가 없으면 클릭해도 이동하지 않음(작성중 카드 등)
                if (card.linkHref) {
                  router.push(card.linkHref);
                }
              }}
            >
              {/* badge: 비공개, 작성중 등 상태 표시 */}
              {card.badge ? (
                <span className={styles.statusBadge}>{card.badge}</span>
              ) : null}

              {/* 프로필 이미지: 실패 시 기본 이미지로 fallback */}
              <div className={styles.avatarCircle}>
                <img
                  src={card.profileImage || DEFAULT_PROFILE_IMG}
                  alt={`${card.name} 프로필`}
                  onError={(event) => {
                    (event.currentTarget as HTMLImageElement).src =
                      DEFAULT_PROFILE_IMG;
                  }}
                />
              </div>

              <div className={styles.cardHeader}>
                <h4 className={styles.name}>{card.name}</h4>

                {/* 작성 중(progressMode) 카드일 때는 카테고리 뱃지 노출 정책 분기 */}
                {!card.progressMode || card.progressMode === "single" ? (
                  card.category || card.subCategory ? (
                    <span className={styles.categoryBadge}>
                      {[card.category, card.subCategory]
                        .filter(Boolean)
                        .join(" / ")}
                    </span>
                  ) : null
                ) : null}
              </div>

              {/* 소개 문구 */}
              {card.intro ? <p className={styles.intro}>{card.intro}</p> : null}

              {/* progressMode가 없을 때(일반 카드)만 연락처 표시 */}
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

      {/* 오른쪽 화살표: 우측 카드로 이동 */}
      <button
        className={`${styles.arrowBtn} ${styles.arrowRight}`}
        onClick={() => setCurrentIndex(rightIdx)}
        aria-label="다음 명함"
      >
        ›
      </button>
    </div>
  );
}