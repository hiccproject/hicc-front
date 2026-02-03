// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import RandomCardWall from "@/components/RandomCardWall";
import styles from "./page.module.css";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);

  // 로그인 상태 확인 (기존 로직 유지)
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    setIsLoggedIn(Boolean(token));
  }, []);

  // 로그인 여부에 따른 버튼 설정
  const primaryCta = isLoggedIn
    ? { href: "/create", label: "명함 만들기" }
    : { href: "/signup", label: "가입하기" };

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        {/* 상단 헤더 영역 */}
        <Header />

        <section className={styles.hero}>
          {/* 1. 설명 영역: z-index가 높아 왼쪽 카드 위로 올라오며, 위치는 상단 20~30% 지점 */}
          <div className={styles.heroLeft}>
            <h1 className={styles.title}>One Page Me</h1>
            <p className={styles.subtitle}>
              나를 설명하는 단 하나의 페이지,
              <br />
              포트폴리오를 간결하게 보여주는 디지털 명함 서비스
            </p>

            <div className={styles.ctaRow}>
              <Link
                href={primaryCta.href}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                {primaryCta.label}
              </Link>
              <Link href="/explore" className={`${styles.btn} ${styles.btnGhost}`}>
                둘러보기
              </Link>
            </div>
          </div>

          {/* 2. 카드 영역: 브라우저 정중앙에 메인 카드가 오도록 배치 */}
          <div className={styles.heroRight}>
            <RandomCardWall />
          </div>
        </section>
      </main>
    </div>
  );
}