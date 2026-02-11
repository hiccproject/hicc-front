// src/app/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import Header from "@/components/Header";
import { loginMember, requestGoogleLogin } from "@/lib/api/auth";
import {
  getStoredNameForLogin,
  getStoredProfile,
  setStoredNameForEmail,
  setStoredProfile,
} from "@/lib/auth/profile";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await loginMember({ email, password });

      const storedProfile = getStoredProfile();
      if (storedProfile?.email && storedProfile?.name?.trim()) {
        setStoredNameForEmail(storedProfile.email, storedProfile.name);
      }

      const resolvedName = getStoredNameForLogin(email) || storedProfile?.name?.trim() || "";
      setStoredProfile({ name: resolvedName, email, password });

      const greetingName = resolvedName ? `${resolvedName}님` : "회원님";
      alert(`로그인 성공! ${greetingName} 환영합니다.`);
      router.push("/");
    } catch (error) {
      alert(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    // 구글 로그인은 "이동"이 전부.
    // 이후 성공/신규 분기(/ 또는 /terms)는 백엔드 리다이렉트가 처리함.
    requestGoogleLogin();
  }

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <section className={styles.body}>
          <form className={styles.form} onSubmit={onSubmit}>
            <h2 className={styles.title}>로그인</h2>

            <div className={styles.inputGroup}>
              <input
                type="text"
                className={styles.input}
                value={email}
                placeholder="이메일을 입력해주세요."
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                className={styles.input}
                value={password}
                placeholder="비밀번호를 입력해주세요."
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>

            {/* [수정] 회원가입과 비밀번호 재설정 위치 변경 */}
            <div className={styles.findLinks}>
              <Link href="/signup" className={styles.signupButton}>
                회원가입
              </Link>
              <Link href="/find-pw">비밀번호 재설정</Link>
            </div>

            <div className={styles.socialDivider}>
              <span>소셜 로그인</span>
            </div>

            <button type="button" className={styles.btnGoogle} onClick={handleGoogleLogin}>
              <img src="/google.png" alt="Google" className={styles.googleIcon} />
              Google 로그인
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}