// src/app/login/page.tsx
//
// 로그인 페이지
// - 이메일/비밀번호 로그인과 Google OAuth 로그인을 제공
// - 이메일/비밀번호 로그인 성공 시 토큰 저장은 loginMember 내부에서 처리된다고 가정하고,
//   이 파일에서는 "로컬 프로필 캐시(이름/이메일/비밀번호)"를 정리해서 저장하는 역할을 맡음
//
// 동작 흐름(이메일/비밀번호 로그인)
// 1) 입력값 검증(이메일/비밀번호 비어있으면 중단)
// 2) loginMember 호출로 로그인 요청
// 3) 기존 로컬 프로필 정보가 있으면 (email -> name) 매핑 캐시를 갱신
// 4) 현재 로그인한 email에 대해 표시용 이름(resolvedName)을 결정하고 로컬 프로필로 저장
// 5) 환영 alert 후 홈으로 이동
//
// 동작 흐름(Google 로그인)
// - requestGoogleLogin()을 호출해 OAuth 시작 URL로 이동
// - 성공/신규유저 분기(/, /terms 등)는 백엔드 리다이렉트 정책에 따라 처리

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

  // email/password: 입력 폼 상태
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // isSubmitting: 중복 제출 방지 및 버튼 상태 표시
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 제출 핸들러
  // - submit 버튼 클릭 또는 Enter 입력 시 호출됨
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 입력값 최소 검증
    // - 서버에 보내기 전에 빈 값은 프론트에서 차단
    if (!email || !password) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    // 요청 중 UI 잠금(중복 클릭 방지)
    setIsSubmitting(true);

    try {
      // 이메일/비밀번호 로그인 요청
      // - 성공 시 토큰 저장은 loginMember 내부에서 처리된다고 가정
      await loginMember({ email, password });

      // storedProfile: 이전에 저장해둔 로컬 프로필 캐시
      // - 이 값은 "표시용 이름" 결정에 재활용되며,
      //   로그인 직후에도 이름을 보여주기 위해 사용된다
      const storedProfile = getStoredProfile();

      // 기존 로컬 프로필에 email/name이 모두 있으면
      // email -> name 매핑 캐시를 업데이트
      // - 같은 이메일로 다시 로그인했을 때 이름을 빠르게 복원하기 위한 목적
      if (storedProfile?.email && storedProfile?.name?.trim()) {
        setStoredNameForEmail(storedProfile.email, storedProfile.name);
      }

      // resolvedName: 환영 문구/헤더 표시 등에 사용할 "최종 이름"
      // 우선순위
      // 1) (email -> name) 매핑 캐시에 저장된 이름
      // 2) 기존 storedProfile에 남아있는 이름
      // 3) 없으면 빈 문자열
      const resolvedName =
        getStoredNameForLogin(email) || storedProfile?.name?.trim() || "";

      // 로컬 프로필 캐시 저장
      // - 서버에서 name을 즉시 내려주지 않는 흐름에서도
      //   UI에서 사용자 이름을 바로 표시하기 위한 목적
      //
      // 주의: 비밀번호를 로컬에 저장하는 방식은 보안상 권장되지 않음
      // - 가능하면 password는 저장하지 않고, 필요 시 세션 기반으로 처리하는 편이 안전
      setStoredProfile({ name: resolvedName, email, password });

      // 사용자 안내
      const greetingName = resolvedName ? `${resolvedName}님` : "회원님";
      alert(`로그인 성공! ${greetingName} 환영합니다.`);

      // 홈으로 이동
      router.push("/");
    } catch (error) {
      // 에러 메시지는 loginMember에서 message를 throw하도록 구현돼 있으면 그대로 사용
      alert(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      // 성공/실패와 무관하게 제출 상태 해제
      setIsSubmitting(false);
    }
  }

  // Google 로그인 시작
  // - 실제로는 OAuth 시작 URL로 이동하는 것만 수행
  // - 이후 redirect 및 신규 유저 분기(약관 동의 등)는 백엔드가 처리
  function handleGoogleLogin() {
    requestGoogleLogin();
  }

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        {/* 상단 공통 헤더 */}
        <Header />

        <section className={styles.body}>
          {/* 로그인 폼 */}
          <form className={styles.form} onSubmit={onSubmit}>
            <h2 className={styles.title}>로그인</h2>

            {/* 입력 영역 */}
            <div className={styles.inputGroup}>
              {/* 이메일 입력 */}
              <input
                type="text"
                className={styles.input}
                value={email}
                placeholder="이메일을 입력해주세요."
                onChange={(e) => setEmail(e.target.value)}
              />

              {/* 비밀번호 입력 */}
              <input
                type="password"
                className={styles.input}
                value={password}
                placeholder="비밀번호를 입력해주세요."
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* 제출 버튼: 요청 중 비활성화 + 텍스트 변경 */}
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={isSubmitting}
            >
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>

            {/* 회원가입/비밀번호 재설정 링크 */}
            <div className={styles.findLinks}>
              <Link href="/signup" className={styles.signupButton}>
                회원가입
              </Link>
              <Link href="/find-pw">비밀번호 재설정</Link>
            </div>

            {/* 소셜 로그인 구분선 */}
            <div className={styles.socialDivider}>
              <span>소셜 로그인</span>
            </div>

            {/* Google 로그인 버튼 */}
            <button
              type="button"
              className={styles.btnGoogle}
              onClick={handleGoogleLogin}
            >
              {/* 단순 img 태그를 사용 중
                  - next/image를 쓰면 최적화 장점이 있지만
                    작은 아이콘은 지금 형태도 문제 없음 */}
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