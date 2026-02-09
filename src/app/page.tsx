"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import RandomCardWall from "@/components/RandomCardWall";
import styles from "./page.module.css";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncAuthState = () => {
      const token = localStorage.getItem("accessToken");
      setIsLoggedIn(Boolean(token));
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    return () => window.removeEventListener("storage", syncAuthState);
  }, []);

  const primaryCta = isLoggedIn
    ? { href: "/create", label: "명함 만들기" }
    : { href: "/signup", label: "가입하기" };

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <h1 className={styles.title}>One Page Me</h1>
            <p className={styles.subtitle}>
              나를 설명하는 단 하나의 페이지,
              <br />
              포트폴리오를 간결하게 보여주는 디지털 명함 서비스
            </p>
            <div className={styles.ctaRow}>
              <Link href={primaryCta.href} className={`${styles.btn} ${styles.btnPrimary}`}>
                {primaryCta.label}
              </Link>
              <Link href="/explore" className={`${styles.btn} ${styles.btnGhost}`}>
                둘러보기
              </Link>
            </div>
          </div>
          <div className={styles.heroRight}>
            <RandomCardWall />
          </div>
        </section>
      </main>
    </div>
  );
}