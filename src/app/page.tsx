"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import RandomCardWall from "@/components/RandomCardWall";
import styles from "./page.module.css";
import { setTokens } from "@/lib/auth/tokens";
import { fetchSignupInfo, loginMemberZeroPassword } from "@/lib/api/auth"; // ✅ 추가
import { setStoredProfile } from "@/lib/auth/profile"; // 필요하면 경로 맞춰줘
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ✅ 구글 로그인 리다이렉트: 토큰 저장 → signup/info → login(0) 체크 → 분기
  useEffect(() => {
    if (typeof window === "undefined") return;

    const run = async () => {
      const url = new URL(window.location.href);
      const accessToken = url.searchParams.get("accessToken");
      const refreshToken = url.searchParams.get("refreshToken");

      if (!accessToken && !refreshToken) return;

      // 1) 토큰 저장
      setTokens({
        accessToken: accessToken ?? undefined,
        refreshToken: refreshToken ?? undefined,
      });

      // 2) 주소창 토큰 제거
      url.searchParams.delete("accessToken");
      url.searchParams.delete("refreshToken");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));

      try {
        // 3) signup/info로 email/name 받기
        const info = await fetchSignupInfo(); // { email, name? } 형태로 구현할 예정
        const email = info.email?.trim() ?? "";
        const name = info.name?.trim() ?? "";

        if (!email) {
          // email이 없으면 플로우가 깨진 거라 일단 홈 유지(또는 로그인 페이지로)
          return;
        }

        // 4) /api/members/login 에 password:"0"로 기존회원 체크
        try {
          await loginMemberZeroPassword(email);
          // ✅ 기존 회원이면 로그인 성공으로 간주 (토큰은 이미 저장되어 있음)
          setIsLoggedIn(true);
          router.replace("/"); // 그대로 홈 유지 or /login-success
          return;
        } catch (e) {
          // ✅ 가입되지 않은 이메일(C002)이면 구글 회원가입 페이지로
          if (e instanceof Error && e.message.includes("C002")) {
            // google-signup 페이지에서 쓸 값 저장
            localStorage.setItem("google_signup_email", email);
            if (name) localStorage.setItem("google_signup_name", name);

            router.replace("/google-signup");
            return;
          }
          // 그 외 에러는 그냥 멈추거나, 로그인 페이지로 보내도 됨
          // router.replace("/login");
        }
      } catch {
        // signup/info 실패 시 처리
        // router.replace("/login");
      }
    };

    run();
  }, [router]);

  // 로그인 상태 확인(기존 로직)
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    setIsLoggedIn(Boolean(token));
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
