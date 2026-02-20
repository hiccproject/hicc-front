// src/app/page.tsx
// 메인 페이지(Home)
//
// 목적
// - 서비스 첫 진입 화면(랜딩 페이지)
// - 로그인 여부에 따라 1차 CTA 버튼을 다르게 노출
//   - 로그인: "명함 만들기" → /create
//   - 비로그인: "시작하기" → /login
// - 랜덤 명함 미리보기(RandomCardWall)로 서비스 성격을 직관적으로 보여줌
//
// 구현에서 중요한 포인트
// 1) "use client"
//    - Next.js App Router에서 기본은 Server Component이므로
//      useEffect/useState/localStorage 접근을 위해 Client Component로 선언
// 2) 로그인 상태 판별을 localStorage의 accessToken 존재 여부로 함
//    - 현재 프로젝트는 토큰을 localStorage에 저장하는 구조이므로 가장 단순한 판별 방식
//    - 단, 토큰이 만료되었더라도 localStorage에 남아있으면 true가 될 수 있음
//      (정확한 로그인 상태가 필요하면 /api/mypage 같은 인증 API로 확인해야 함)
// 3) storage 이벤트로 토큰 변경을 동기화
//    - 다른 탭에서 로그인/로그아웃이 발생했을 때 이 탭의 UI도 업데이트하기 위함
//    - 주의: storage 이벤트는 "다른 탭"에서 localStorage가 변경될 때만 발생하고,
//            같은 탭에서 변경될 때는 발생하지 않음
//      그래서 초기 실행(syncAuthState())이 반드시 필요하고,
//      같은 탭에서 로그아웃 버튼 등으로 상태를 바꿀 때는
//      해당 컴포넌트가 다시 렌더되거나 별도 상태 갱신 로직이 있어야 함

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import RandomCardWall from "@/components/RandomCardWall";
import styles from "./page.module.css";

export default function HomePage() {
  // isLoggedIn: UI 레벨에서 "로그인처럼 보이게" 만들기 위한 상태 값
  // 토큰 존재 여부만 확인하므로, 엄밀한 인증 상태(만료 여부)까지 보장하진 않음
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // SSR 방어
    // 이 파일은 client component지만, 안전하게 window 체크를 두는 습관은 유지해도 무방
    if (typeof window === "undefined") return;

    // syncAuthState
    // - localStorage의 accessToken 존재 여부를 읽어 isLoggedIn 상태를 갱신
    // - 홈 진입 시 1회 호출 + storage 이벤트로 다른 탭 변경 사항 반영
    const syncAuthState = () => {
      const token = localStorage.getItem("accessToken");
      setIsLoggedIn(Boolean(token));
    };

    // 최초 실행: 현재 탭의 초기 상태를 반영
    syncAuthState();

    // 다른 탭에서 로그인/로그아웃(토큰 저장/삭제)했을 때 이 탭도 반영
    window.addEventListener("storage", syncAuthState);

    // 컴포넌트 unmount 시 이벤트 제거(메모리 누수 방지)
    return () => window.removeEventListener("storage", syncAuthState);
  }, []);

  // primaryCta
  // - 로그인 여부에 따라 유저가 가장 많이 눌러야 하는 버튼 목적지를 바꿈
  // - 비로그인은 온보딩(로그인)으로 유도, 로그인 유저는 바로 생성 플로우로 유도
  const primaryCta = isLoggedIn
    ? { href: "/create", label: "명함 만들기" }
    : { href: "/login", label: "시작하기" };

  return (
    <div className={styles.bg}>
      <div className={styles.headerWrap}>
        <Header />
      </div>

      <main className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <h1 className={styles.title}>One Page Me</h1>

            <p className={styles.subtitle}>
              나를 설명하는 단 하나의 페이지,
              <br />
              포트폴리오를 간결하게 보여주는 디지털 명함 서비스
            </p>

            <div className={styles.ctaRow}>
              {/* 1차 CTA: 로그인 여부에 따라 /create 또는 /login */}
              <Link
                href={primaryCta.href}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                {primaryCta.label}
              </Link>

              {/* 2차 CTA: 누구나 공개 카드 목록을 둘러볼 수 있게 /explore */}
              <Link
                href="/explore"
                className={`${styles.btn} ${styles.btnGhost}`}
              >
                둘러보기
              </Link>
            </div>
          </div>

          {/* 시각적 요소: 랜덤 명함 미리보기로 서비스 컨셉을 즉시 전달 */}
          <div className={styles.heroRight}>
            <RandomCardWall />
          </div>
        </section>
      </main>
    </div>
  );
}