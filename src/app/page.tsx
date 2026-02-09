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
  // ✅ 구글 로그인 리다이렉트: 토큰 저장 → (옵션) signup/info → (옵션) 기존회원 체크 → 분기
useEffect(() => {
  if (typeof window === "undefined") return;

  const run = async () => {
    const url = new URL(window.location.href);
    const accessToken = url.searchParams.get("accessToken");
    const refreshToken = url.searchParams.get("refreshToken");

    // 홈에 토큰 없이 들어온 경우엔 아무것도 안 함
    if (!accessToken && !refreshToken) return;

    // 1) 토큰 저장
    setTokens({
      accessToken: accessToken ?? undefined,
      refreshToken: refreshToken ?? undefined,
    });

    // ✅ 토큰이 내려온 순간 "일단 로그인 상태"로 처리 (이게 핵심)
    setIsLoggedIn(true);

    // 2) 주소창 토큰 제거
    url.searchParams.delete("accessToken");
    url.searchParams.delete("refreshToken");
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));

    // 3) 아래 흐름은 "부가 확인"이므로 실패해도 홈을 유지해야 함
    try {
      const info = await fetchSignupInfo(); // { email, name? }
      const email = info.email?.trim() ?? "";
      const name = info.name?.trim() ?? "";

      if (!email) {
        // info가 이상해도 홈 유지
        return;
      }

      // 4) 기존회원 체크 (실패 시에만 google-signup으로 보내고, 그 외엔 홈 유지)
      try {
        await loginMemberZeroPassword(email);
        // 기존 회원이면 홈 유지 (이미 setIsLoggedIn(true))
        return;
      } catch (e) {
        if (e instanceof Error && e.message.includes("C002")) {
          localStorage.setItem("google_signup_email", email);
          if (name) localStorage.setItem("google_signup_name", name);
          router.replace("/google-signup");
          return;
        }

        // ✅ 여기서 절대 /login으로 보내지 말고 홈 유지
        console.warn("기존회원 체크 실패(홈 유지):", e);
        return;
      }
    } catch (e) {
      // ✅ signup/info 실패도 홈 유지 (토큰이 있으니)
      console.warn("signup/info 실패(홈 유지):", e);
      return;
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
