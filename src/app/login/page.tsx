"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import Header from "../../components/Header";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const performLogin = (targetId: string) => {
    localStorage.setItem("accessToken", "dummy-token-1234");
    alert(`로그인 성공! ${targetId}님 환영합니다.`);
    router.push("/");
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (id && password) {
      performLogin(id);
    } else {
      alert("아이디와 비밀번호를 입력해주세요.");
    }
  }

  return (
    <div className={styles.bg}> {/* 전체 회색 배경 */}
      <main className={styles.shell}> {/* 중앙 흰색 사각형 */}
        <Header />

        <section className={styles.body}>
          <form className={styles.form} onSubmit={onSubmit}>
            <h2 className={styles.title}>로그인</h2>

            <div className={styles.inputGroup}>
              <input
                type="text"
                className={styles.input}
                value={id}
                placeholder="아이디를 입력해주세요."
                onChange={(e) => setId(e.target.value)}
              />
              <input
                type="password"
                className={styles.input}
                value={password}
                placeholder="비밀번호를 입력해주세요."
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className={styles.btnPrimary}>
              로그인
            </button>

            <div className={styles.findLinks}>
              <Link href="/find-pw">비밀번호 찾기</Link>
            </div>

            {/* 이미지의 소셜 로그인 구분선 구조 추가 */}
            <div className={styles.socialDivider}>
              <span>소셜 로그인</span>
            </div>

            <button
              type="button"
              className={styles.btnGoogle}
              onClick={() => alert("Google 로그인 시도")}
            >
              <img
                src="/google.png"
                alt="Google" 
                className={styles.googleIcon} 
              />
              Google 로그인
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}